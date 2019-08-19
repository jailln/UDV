import { DocumentModule } from "../../Documents/DocumentModule";
import { LinkService } from "../Model/LinkService";
import { focusCameraOn } from "../../../Utils/Camera/CameraUtils";
import * as THREE from 'three';
import { DocumentProvider } from "../../Documents/ViewModel/DocumentProvider";
import { EventSender } from "../../../Utils/Events/EventSender";
import { Link } from "../Model/Link";
import { Window } from "../../../Utils/GUI/js/Window";
import { LinkProvider } from "../ViewModel/LinkProvider";

/**
 * The interface extensions for the document windows.
 */
export class DocumentLinkInterface {
  /**
   * Constructs the document link interface.
   * 
   * @param {DocumentModule} documentModule The document module.
   * @param {LinkProvider} linkProvider The link provider.
   * @param {*} itownsView The iTowns view.
   * @param {*} cameraControls The camera controls.
   */
  constructor(documentModule, linkProvider, itownsView, cameraControls) {
    /**
     * 
     */
    this.provider = linkProvider;

    /**
     * 
     * 
     * @type {Array<Link>}
     */
    this.documentLinks = [];

    this.itownsView = itownsView;
    
    this.cameraControls = cameraControls;

    documentModule.addInspectorExtension('links', {
      type: 'div',
      html: /*html*/`
        <input type="checkbox" class="spoiler-check" id="doc-link-spoiler">
        <label for="doc-link-spoiler" class="section-title">Document Links</label>
        <div class="spoiler-box">
          <div id="${this.linkListId}">
          
          </div>
          <button id="${this.highlightDocButtonId}">Highlight city objects</button>
          <button id="${this.createLinkButtonId}">Select & link a city object</button>
        </div>`
    });

    linkProvider.addEventListener(DocumentProvider.EVENT_DISPLAYED_DOC_CHANGED,
      () => this._updateLinkList());

    documentModule.view.inspectorWindow.addEventListener(Window.EVENT_CREATED,
      () => this._init());
  }

  _init() {
    this.highlightDocButtonElement.onclick = () => {
      this.provider.highlightDisplayedDocumentLinks();
    };

    this.createLinkButtonElement.onclick = async () => {
      if (!!this.provider.selectedCityObject) {
        let newLink = new Link();
        newLink.source_id = this.provider.displayedDocument.id;
        newLink.target_id = this.provider.selectedCityObject.props['cityobject.database_id'];
        newLink.centroid_x = this.provider.selectedCityObject.centroid.x;
        newLink.centroid_y = this.provider.selectedCityObject.centroid.y;
        newLink.centroid_z = this.provider.selectedCityObject.centroid.z;
        if (confirm('Are you sure you want to associate the document with this city object ?')) {
          try {
            await this.provider.createLink(newLink);
          } catch (e) {
            alert(e);
          }
        }
      } else {
        alert('Select a city object to link with the document.');
        // @TODO open the city object module
        // And if possible, start the selection process
      }
    };
  }

  ///////////////
  ///// LINK LIST

  /**
   * Retrieves all link types, and for each type retrieves the links were the
   * source id is the same as the current document. The links are then displayed
   * in the window. Two buttons are created for each link, called "highlight"
   * and "travel". Clicking on the "highlight" button triggers the
   * `highlightLink` method, while the "travel" button calls the `travelToLink`
   * method.
   */
  async _updateLinkList() {
    let links = this.provider.getDisplayedDocumentLinks();
    let newDiv = document.createElement('div');
    let newDivHtml = `<h4 class="subsection-title">${links.length} city object(s)</h4>
                      <ul>`;
    this.documentLinks = links;
    for (let link of links) {
      newDivHtml += `<li>
                        ID : ${link.target_id}
                        <span id="${this.linkTravelerId(link)}" class="clickable-text">
                        travel
                        </span>
                        <span id="${this.linkDeleterId(link)}" class="clickable-text">
                        delete
                        </span>
                      </li>`;
    }
    newDivHtml += '</ul>';
    newDiv.innerHTML = newDivHtml;
    this.linkListElement.innerHTML = '';
    this.linkListElement.appendChild(newDiv);
    for (let link of links) {
      document.getElementById(this.linkTravelerId(link)).onclick = () => {
        this._travelToLink(link);
      };
      document.getElementById(this.linkDeleterId(link)).onclick = () => {
        this._deleteLink(link);
      };
    }
  }


  ////////////////////
  ///// LINK OPERATION

  /**
   * If the target is a city object, moves the camera to focus on its centroid.
   * 
   * @param {Link} link The link to travel to.
   */
  async _travelToLink(link) {
    let centroid = new THREE.Vector3(link.centroid_x, link.centroid_y,
      link.centroid_z);
    await focusCameraOn(this.itownsView, this.cameraControls, centroid,
      {duration: 1});
  }

  /**
   * Deletes the link.
   * 
   * @param {Link} link The link to delete.
   */
  async _deleteLink(link) {
    if (confirm('Are you sure you want to delete this link ?')) {
      try {
        await this.provider.deleteLink(link);
      } catch (e) {
        alert(`Failed to detete link : ${e}`);
      }
    }
  }

  //////////////
  ////// GETTERS

  get linkListId() {
    return `${this.windowId}_link_list`;
  }

  get linkListElement() {
    return document.getElementById(this.linkListId);
  }

  linkTravelerId(link) {
    return `${this.linkListId}_${link.id}_travel`;
  }

  linkDeleterId(link) {
    return `${this.linkListId}_${link.id}_delete`;
  }

  get highlightDocButtonId() {
    return `${this.windowId}_highlight_doc_button`;
  }

  get highlightDocButtonElement() {
    return document.getElementById(this.highlightDocButtonId);
  }

  get createLinkButtonId() {
    return `${this.windowId}_create_link`;
  }

  get createLinkButtonElement() {
    return document.getElementById(this.createLinkButtonId);
  }
}
