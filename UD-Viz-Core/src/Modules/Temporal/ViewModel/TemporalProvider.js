import { TilesManager } from '../../../Utils/3DTiles/TilesManager.js'
import { getVisibleTiles } from '../../../Utils/3DTiles/3DTilesUtils.js';
import { CityObjectStyle } from '../../../Utils/3DTiles/Model/CityObjectStyle.js';
import { CityObjectID } from '../../../Utils/3DTiles/Model/CityObject.js';

// TODO: harmoniser les noms display state, feature display state, transaction
// style, etc.
/**
 * Contains the logic for city objects and transactions display
 */
export class TemporalProvider {
  constructor(temporalExtensionModel, tilesManager, currentTime) {
    this.temporalExtensionModel = temporalExtensionModel;

    this.tilesManager = tilesManager;

    this.currentTime = currentTime;

    /** Store the display states of features of the tiles per date 
     * to avoid computing it multiple times. It's actually a map 
     * of a map and its structure is:
     * { date: tile : [ displayStates ] } } where displayStates is
     * an array of transactions (the name is associated with the styles)
     * */ 
    this.datedTilesDisplayStates = new Map();

    // Initialize the styles affected to transactions. Will be 
    // used to update the 3D view.
    // TODO: could be passed as a config of the module and if not 
    // defined, we could initialize default styles.
    this.initTransactionsStyles();

    // Initialize the model. One part of this model is filled when the
    // temporal extension is loaded by iTowns; an other part is filled 
    // with the event declared below (when a tile is loaded).
    // See the comment at the end of the $3DTemporalExtension constructor
    // for more details
    this.tilesManager.addEventListener(
      TilesManager.EVENT_TILE_LOADED,
      this.temporalExtensionModel.updateTileExtensionModel.bind(
        this.temporalExtensionModel));

    // When a tile is loaded, we compute the state of its features (e.g.
    // should they be displayed or not and in which color, etc.)
    this.tilesManager.addEventListener(
      TilesManager.EVENT_TILE_LOADED, 
      this.changeTileState.bind(this));
  }

  initTransactionsStyles() {
    // Set styles
    this.tilesManager.registerStyle('noTransaction', new CityObjectStyle({
        materialProps: { opacity: 1.0, color: 0xffffff } })); // white

    this.tilesManager.registerStyle('creation', new CityObjectStyle({
        materialProps: { opacity: 0.6, color: 0x009900 } })); // green

    this.tilesManager.registerStyle('demolition', new CityObjectStyle({
        materialProps: { opacity: 0.6, color: 0xff0000 } })); // red

    this.tilesManager.registerStyle('modification', new CityObjectStyle({
        materialProps: { opacity: 0.6, color: 0xFFD700 } })); // yellow

    this.tilesManager.registerStyle('hide', new CityObjectStyle({
        materialProps: { opacity: 0, color: 0xffffff, alphaTest: 0.3 } })); // hidden
  }

    // TODO: probablement à faire directement au parsing des transactions 
    // et mettre ça dans un attribut 'styleName'. A voir au moment où je 
    // virerai le transactionManager.
    /**
     * Generates the style name of a transaction. This method is recursive
     * for aggregated transactions that may have multiple nested transactions. 
     * The style name correspond to the one created in the 
     * initTransactionsStyles method).
     * 
     * @param {$3DTemporalTransaction} transaction The transaction 
     * to generate the style name from.
     * 
     * @returns {string} If the transaction is a primary transaction, 
     * returns its type. If it is an aggregated transaction, it returns a
     * concatenation of the primary transactions types aggregated in 
     * transaction, prefixed by 'aggregate'. Currently, no style are 
     * declared for transactions aggregates for a simpler visual 
     * rendering. We could also generate styles with random colors
     * and add them to a legend and provide a user the possibility to
     * update these colors and / or to disable them from the GUI.
     */
    getTransactionStyleName(transaction, styleName) {
        if (transaction.isPrimary) return transaction.type;
        else if (transaction.isAggregate) {
            if (styleName === '') styleName = 'aggregate'; // prefix
            for (let i = 0 ; i < transaction.transactions.length ; i++) {
                styleName = styleName + '-' + this.getTransactionStyleName(
                    transaction.transactions[i], styleName);
            }
            return styleName
        } else {
            console.warn('Transaction which is not a primary nor an aggregate.')
        }
    }

    /* *** Culling with transactions and colors management     */
    // Rules for culling:
    //   * If the feature exists at the currentTime we display it in gray
    //   * If there is a transaction between the feature and another
    //   feature at the currentTime:
    //      * the displayed geometry is the one of the old feature for the
    //      first half duration of the transaction
    //      * the displayed geometry is the one of the new feature for the
    //      second half of the duration
    //      * the opacity is set to 0.5
    //      * the color is set depending on the transaction type (defined in
    //      transactionsColors)
    //   * else we hide the feature.
    // TODO: possibilite d'ajouter des "continue" apres les featuresdisplaystate.push
    culling(BT) {
      const featuresDisplayStates = [];
      for (let i = 0; i < BT.featureIds.length; i++) {
          const featureId = BT.featureIds[i];
          if (this.currentTime >= BT.startDates[i] && this.currentTime <=
            BT.endDates[i]) {
              // ** FEATURE EXISTS
              featuresDisplayStates.push('noTransaction');
          } else if (BT.featuresTransacs[featureId]) {
              // ** TRANSACTION CASE
              let hasTransac = false;
              const transacAsSource = BT.featuresTransacs[featureId].asSource;
              if (transacAsSource) {
                  const transacAsSourceHalfDuration = (transacAsSource.endDate -
                      transacAsSource.startDate) / 2;
                  if (this.currentTime > transacAsSource.startDate && this.currentTime <=
                      transacAsSource.startDate + transacAsSourceHalfDuration) {
                      hasTransac = true;
                      featuresDisplayStates.push(
                          this.getTransactionStyleName(transacAsSource, ''));
                  }
              }
              const transacAsDest = BT.featuresTransacs[featureId].asDestination;
              if (transacAsDest) {
                  const transacAsDestHalfDuration = (transacAsDest.endDate -
                      transacAsDest.startDate) / 2;
                  if (this.currentTime > transacAsDest.startDate +
                      transacAsDestHalfDuration && this.currentTime <=
                      transacAsDest.endDate) {
                      hasTransac = true;
                      featuresDisplayStates.push(
                          this.getTransactionStyleName(transacAsDest, ''));
                  }
              }

              if (!hasTransac) {
                  // ** TRANSACTION NOT AT THE RIGHT DATE
                  featuresDisplayStates.push('hide');
              }
          } else {
              // ** FEATURE DOES NOT EXIST AND THERE IS NO TRANSACTION

              // ** MANAGE CREATIONS AND DEMOLITIONS (this step must be
              // done because the creation and demolitions transactions
              // are currently not in the tileset. However, the tileset
              // should have them later on).
              const halfVintage = 1.5;

              if (this.currentTime + halfVintage >= BT.startDates[i] &&
                  this.currentTime < BT.startDates[i]) {
                  // ** CREATION
                  featuresDisplayStates.push('creation');
              } else if (this.currentTime - halfVintage < BT.endDates[i] &&
                  this.currentTime > BT.endDates[i]) {
                  // ** DEMOLITION
                  featuresDisplayStates.push('demolition');
              } else {
                  // ** FEATURE DOES NOT EXIST
                  featuresDisplayStates.push('hide');
              }
          }
      }

      return featuresDisplayStates;
  }

  computeFeaturesStates(tileId) {
    let featuresDisplayStates = {};
    if (tileId === 0) return featuresDisplayStates; // Skip root tile which has no geometry
    // If it has already been computed, don't do it again
    if (this.datedTilesDisplayStates.has(this.currentTime) &&
        this.datedTilesDisplayStates.get(this.currentTime).has(tileId)) {
        return this.datedTilesDisplayStates.get(this.currentTime).get(tileId);
    }
    const tileTemporalBT = this.temporalExtensionModel.temporalBatchTables[tileId];
    if (tileTemporalBT) {
        if (! this.datedTilesDisplayStates.has(this.currentTime)) {
            this.datedTilesDisplayStates.set(this.currentTime, new Map());
        }
        featuresDisplayStates = this.culling(tileTemporalBT);
        this.datedTilesDisplayStates.get(this.currentTime).set(tileId, featuresDisplayStates);
    } else {
      console.warn(`Cannot compute features states for tile ${tileId}  
      since the temporal extension of the batch table has not yet been 
      loaded for this tile`);
    }
    return featuresDisplayStates;
  }

  computeTileState(tileContent) {
    const featuresStates = this.computeFeaturesStates(tileContent.tileId);
    let featureStyleName;
    for (let i = 0; i < featuresStates.length; i++) {
        featureStyleName = featuresStates[i];
        if(this.tilesManager.isStyleRegistered(featureStyleName)) {
            this.tilesManager.setStyle(new CityObjectID(tileContent.tileId, i), 
            featureStyleName);
        } else {
            console.warn("Style " +  featureStyleName + " is not " + 
            "registered. Defaulting to style noTransaction.")
            this.tilesManager.setStyle(new CityObjectID(tileContent.tileId, i), 
            'noTransaction');
        }
    }
  }

  changeTileState(tileContent) {
      this.computeTileState(tileContent);
      this.tilesManager.applyStyleToTile(tileContent.tileId, 
        { updateView: false });
  } 

  changeVisibleTilesStates() {
      const tiles = getVisibleTiles(this.tilesManager.layer);
      for (let i = 0; i < tiles.length; i++) {
          this.computeTileState(tiles[i]);
      }
      this.tilesManager.applyStyles();
  }

}