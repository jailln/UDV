/**
* Class: Temporal Controller
* This controller handles the temporal window inputs (slider, buttons, input field)
* It holds the current date which can changed by the user input or by Document Handler
* For the demo, the controller also has buildingVersions and buildingDates array
* These are used to change the version of a 3d object according to the date
*/

// FIXME: Change date creation: "parsing of date strings with the Date constructor
// (and Date.parse, they are equivalent) is strongly discouraged due to browser differences and inconsistencies."
// (see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date)

// FIXME: Previous and Next buttons are disabled. We might need to enable them again
// especially for Vilo3D app which has a keydates concept.

// FIXME: Add a settings button in the temporal module

// we use the THREE.js library provided by itowns
THREE = itowns.THREE;

//update the html with elements for this class (windows, buttons etc)
var temporalDiv = document.createElement("div");
temporalDiv.id = 'temporal';
document.body.appendChild(temporalDiv);

document.getElementById("temporal").innerHTML = '<button id="temporalTab">TEMPOREL</button>\
<div id="temporalWindow">\
<div id="timeSliderMinDate"></div>\
<div id="timeSliderMaxDate"></div>\
<input id="timeSlider" type="range">\
<input id="timeDateSelector" type="date">\
</div>\
</div>';

// FIXME: Temp function to add days to a js Date object. This should be in an utils
// file or we might need to use moment.js
Date.prototype.addDays = function(days) {
  var date = new Date(this.valueOf());
  date.setDate(date.getDate() + days);
  return date;
}

/**
* Constructor for TemporalController Class
* Handles the temporal window functionalities (date inputs)
* Emit event with the date of the slider (display date) which will be trapped by iTowns
* which will run culling tests according to this display date.
* This controller uses javascript Date object https://www.w3schools.com/jsref/jsref_obj_date.asp
* FIXME:
* Versions of the 3d object are given as param with options.buildingVersions,
* and Dates corresponding to these versions with options.buildingDates
* This object is initialized after the loading of the 3d objects (asynchronous)
* @param view : itowns planar view
* @param controls : PlanarControls instance
* @param options : optional parameters (including buildingVersions & Dates)
* FIXME: Specify possible options, types and default value
*/
//=============================================================================
function TemporalController(view, options={}) {

    this.view = view;

    // array of 3d objects
    // this.buildingVersions = options.buildingVersions || [];

    // array of dates (js Date object) corresponding to the 3d objects
    // this.buildingDates = options.buildingDates || [];

    // array storing the positions of buildingVersions
    // this.buildingPositions = [];

    // FIXME: Check if dates are valid

    // Start date of the visualisation
    this.startDate = options.startDate || Date.now();

    // End date of the visualisation
    this.endDate = options.endDate || Date.now();

    // Step (in days) of the slider
    // FIXME: timestep might needs to be a date ? or to be in ms ?
    this.timeStep = options.timeStep || 1;

    // currently active temporal version (3d object)
    // this.currentVersion = null;

    // the index to identify an element in the arrays (date, version, position)
    // all arrays have same size and order, so index are valid for any array
    // this.currentVersionIndex = -1;
    // this.lastVersionIndex = -2;

    // min and max date for the temporal slider. Currently, default values correspond
    // to the one of Vilo3D demo
    // FIXME: Modify default dates to e.g. today -> 2100 and add them as option in
    // Vilo3D example
    // this.minDate = new Date(options.minDate) || new Date( "1700-01-01" );
    // this.maxDate = new Date(options.maxDate) || new Date( "2018-01-01" );

    // FIXME: Is this mandatory ?
    this.enabled = false;

    // number of character in the displayed date (use 4 for year only, 10 for yyyy-mm-dd)
    this.dateDisplayLength = options.dateDisplayLength || 10;

    // concurrent view = all temporal versions on top of each other
    // this.isInConcurrentView = false;

    // Z offset between each concurrent version
    // this.concurrentViewOffset = options.concurrentViewOffset || 45;

    // is the temporal window open or not
    this.temporalWindowIsActive = false;

    // FIXME : Is this needed ?
    this.useBuildings = false;

    // called after 3d objects have been loaded
    //=============================================================================
    this.initialize = function initialize(){

        // this.useBuildings = (this.buildingVersions.length!==0 && this.buildingDates.length!==0);

        /* this.buildingVersions.forEach((element)=>{
            this.buildingPositions.push(element.position.clone());
        }); */

        this.enabled = true;

        // this.syncBuildingVersionToCurrentDate(true);

        // setup the display
        var StartDateISO = this.startDate.toISOString().substring(0,this.dateDisplayLength);
        var endDateISO = this.endDate.toISOString().substring(0,this.dateDisplayLength);
        document.getElementById("timeDateSelector").value = StartDateISO;
        document.getElementById("timeSlider").min = this.startDate.;
        document.getElementById("timeSlider").max = endDateISO;
        document.getElementById("timeSlider").value = StartDateISO;
        document.getElementById("timeSlider").step = this.timeStep;
        document.getElementById("timeSliderMinDate").innerHTML = StartDateISO;
        document.getElementById("timeSliderMaxDate").innerHTML = endDateISO;

        // FIXME: This function should probably emit an event requesting an
        // update in itowns. Using this: this.view.notifyChange(true); ?
    };

    // sync current version to current date
    // this does nothing if the current version is already the right one, unless forceSync is true
    //=============================================================================
    // this.syncBuildingVersionToCurrentDate = function syncBuildingVersionToCurrentDate(forceSync){

        // if(!this.enabled || !this.useBuildings){
        //     return;
        // }
        // if(this.isInConcurrentView){
        //     this.toggleConcurrentView();
        //     return;
        // }

        // get the version index corresponding to the current date
        // this.buildingDates.forEach((element,index)=>{
        //
        //     if(this.currentDate >= element){
        //         this.currentVersionIndex = index;
        //     }
        // });

        // if the index is the same as before, exit the function, unless forceSync is true
        // if(this.currentVersionIndex === this.lastVersionIndex && !forceSync){
        //     return;
        // }

        // // for each version : add it to the scene if the index is the right one, remove it if not
        // this.buildingVersions.forEach((element, index)=>{
        //
        //     if(index === this.currentVersionIndex){
        //         this.view.scene.add(element);
        //         this.currentVersion = element;
        //     }
        //     else{
        //         this.view.scene.remove(element);
        //     }
        // });

        // this.lastVersionIndex = this.currentVersionIndex;

        // request a redraw of the scene
        // this.view.notifyChange(true);

  //  };

    // show or hide (toggle) the concurrent view of the temporal versions (all versions on top of each other)
    //=============================================================================
    // this.toggleConcurrentView = function toggleConcurrentView(){
    //
    //     if(!this.enabled || !this.useBuildings){
    //         return;
    //     }
    //
    //     this.isInConcurrentView = !this.isInConcurrentView;
    //
    //     // remove current version, display all the concurrent versions
    //     if(this.isInConcurrentView){
    //         this.view.scene.remove(this.currentVersion);
    //
    //         this.buildingVersions.forEach((element, index)=>{
    //
    //             element.position.z += this.concurrentViewOffset * (this.buildingVersions.length-1 - index);
    //             element.updateMatrixWorld();
    //
    //             this.view.scene.add(element);
    //
    //         });
    //     }
    //     else{
    //         //  remove all the concurrent versions, display the current version
    //         this.buildingVersions.forEach((element, index)=>{
    //
    //             element.position.copy(this.buildingPositions[index]);
    //
    //             element.updateMatrixWorld();
    //         });
    //
    //         this.syncBuildingVersionToCurrentDate(true);
    //
    //     }
    //
    //     // request redraw of the scene
    //     this.view.notifyChange(true);
    //
    // }

    // called when the user input a new date with the date selector
    //=============================================================================
    this.timeSelection = function timeSelection(){
        if(!this.enabled){
            return;
        }

        var date = new Date(document.getElementById("timeDateSelector").value.toString());

        // check if date is valid
        if ( Object.prototype.toString.call(date) === "[object Date]"
            && !isNaN( d.getTime() ) ) {
            // it is a date which is valid
              this.changeDate(date);
            }
    };

    // called when the user input a new date with the time slider
    //=============================================================================
    this.timeSelectionSlider = function timeSelectionSlider() {
        if(!this.enabled){
            return;
        }

        var date = new Date(document.getElementById("timeSlider").value.toString());

        // check if date is valid
        if ( Object.prototype.toString.call(date) === "[object Date]"
            && !isNaN( d.getTime() ) ) {
            // it is a date which is valid
              this.changeDate(date);
            }
    };

    // go to the next date (next temporal version)
    //=============================================================================
    /* this.goToNextDate = function goToNextDate(){
        if(!this.enabled){
            return;
        }

        this.changeDate(this.currentDate + this.timeStep);
    } */

    // go to the previous key date (previous temporal version)
    //=============================================================================
    /* this.goToPreviousDate = function goToPreviousDate(){
        if(!this.enabled || !this.useBuildings){
            return;
        }

        this.changeDate(this.currentDate + this.timeStep);

    } */

    // change the current date and sync the temporal version to this new date
    //=============================================================================
    this.changeDate = function changeDate(date){

        document.getElementById("timeSlider").value = date.toISOString().substring(0,this.dateDisplayLength);
        document.getElementById("timeDateSelector").value = date.toISOString().substring(0,this.dateDisplayLength);

        // FIXME: this function might need to emit an event
        this.currentDate = date;

        // this.syncBuildingVersionToCurrentDate(false);
    }

    // hide or show the temporal window
    //=============================================================================
    this.toggleTemporalWindow = function toggleTemporalWindow(){

        document.getElementById('temporalWindow').style.display = this.temporalWindowIsActive ? "none" : "block";
        this.temporalWindowIsActive = this.temporalWindowIsActive ? false : true;
    }

    document.getElementById("timeDateSelector").addEventListener('input', this.timeSelection.bind(this), false);
    document.getElementById("timeSlider").addEventListener('input', this.timeSelectionSlider.bind(this), false);
    // document.getElementById("timeConcurrentView").addEventListener('mousedown', this.toggleConcurrentView.bind(this), false);
    /* document.getElementById("timeNextButton").addEventListener('mousedown', this.goToNextDate.bind(this), false);
    document.getElementById("timePreviousButton").addEventListener('mousedown', this.goToPreviousDate.bind(this), false); */
    document.getElementById("temporalTab").addEventListener('mousedown', this.toggleTemporalWindow.bind(this), false);

    // event listener to trigger this.initialize after models are loaded
    // FIXME: This could be done using promises
    this.initialize();
    window.addEventListener('allModelsLoaded', this.initialize.bind(this), false);

}
