//import apogeeutil from "/apogeejs-util-lib/src/apogeeUtilLib.js";
//import {uiutil,showConfigurableDialog}  from "/apogeejs-ui-lib/src/apogeeUiLib.js";
import * as fileAccessConstants from "/apogeejs-combined-file-access/src/fileAccessConstants.js";

///////////////////////////
const {uiutil,showConfigurableDialog} = apogeeui;
///////////////////////////

/** This is generic remote file source to be used with CombinedFileAccess.
 * To create a specific instance, pass in the source generator and a file system instance object.
 * NOTE - for the time being there is one remote file system, OneDrive. It should be expanded into a
 * base class and implementation class. */
export default class RemoteFileSource {
    /** constructor */
    constructor(sourceGenerator,fileSystemInstance,action,fileMetadata,fileData,onComplete) {
        this.action = action;
        this.initialFileMetadata = fileMetadata;
        this.fileData = fileData;
        this.onComplete = onComplete;

        //this is the generator to get some 
        this.sourceGenerator = sourceGenerator;

        //this object is the interface to the file system
        this.remoteFileSystem = fileSystemInstance;

        // this.drivesInfo
        // this.selectedDriveId
        this.driveSelectionElementMap = {}

        // this.folderInfo
        this.fileElementMap = {};

        this.loginState = null


        // this.actionElement
        // this.configElement

        // this.saveFileNameField
        // this.openFileNameField
        // this.pathElement
        // this.fileListTable
        // this.drivesListElement
        // this.allCheckbox
        // this.jsonCheckbox
        // this.textCheckbox
        // this.loggedOutShield

        // this.loginElement
        // this.userElement
        // this.logoutElement

        this.filter = _allFilter;
    }

    //============================
    // Public Methods
    //============================

    getGenerator() {
        return this.sourceGenerator;
    }

    //-----------------------------
    // File Actions
    //-----------------------------

    updateFile() {
        let fileInfo = this.initialFileMetadata.fileInfo;
        let saveFilePromise = this.remoteFileSystem.updateFile(fileInfo.driveId,fileInfo.fileId,this.fileData);

        saveFilePromise.then( fileMetadata => {
            //success
            if(this.onComplete) this.onComplete(null,true,fileMetadata); 
        }).catch(error => {
            //error
            let errorMsg = error.message ? error.message : error ? error.toString() : "Unknown";
            if(this.onComplete) this.onComplete(errorMsg,false,null);
        }) ;
    }

    createFile(driveId,folderId,fileName) {
        let saveFilePromise = this.remoteFileSystem.createFile(driveId,folderId,fileName,this.fileData);

        saveFilePromise.then( fileMetadata => {
            //success
            if(this.onComplete) this.onComplete(null,true,fileMetadata); 
        }).catch(error => {
            //error
            let errorMsg = error.message ? error.message : error ? error.toString() : "Unknown";
            if(this.onComplete) this.onComplete(errorMsg,false,null);
        }) ;
    }

    openFile(driveId,fileId) {
        let openFilePromise = this.remoteFileSystem.openFile(driveId,fileId);

        openFilePromise.then( result => {
            //success
            if(this.onComplete) this.onComplete(null,result.data,result.fileMetadata); 
        }).catch(error => {
            //error
            let errorMsg = error.message ? error.message : error ? error.toString() : "Unknown";
            if(this.onComplete) this.onComplete(errorMsg,false,null);
        }) ;
    }

    cancelAction() {
        if(this.onComplete) this.onComplete(null,false,null);
    }

    /** This method is called externally after the dialog box using the soruce closes. */
    close() {
        this.remoteFileSystem.close();

        //FILL THIS IN!!!
        if(this.configElement) {
            this.configElement = null;
        }
        if(this.actionElement) {
            this.actionElement = null;
        }
    }

    //-----------------------------
    // UI Interface
    //-----------------------------

    makeActive() {

    }

    getIconUrl() {
        return null;
    }

    getActionElement() {
        if(!this.actionElement) {
            this._createActionElement();
            //populate initial data if we are logged in
            let loginState = this.remoteFileSystem.getLoginInfo();
            if(loginState.state == fileAccessConstants.LOGGED_IN) {
                this._populateActionForm();
            }
        }
        return this.actionElement;
    }

    getConfigElement() {
        if(!this.configElement) {
            this._createConfigElement();
            //set initial login state
            this.remoteFileSystem.setLoginStateCallback(loginState => this._setLoginState(loginState));
            let loginState = this.remoteFileSystem.getLoginInfo();
            this._setLoginState(loginState);
        }
        return this.configElement;
    }


    //===================================
    // Private Methods
    //===================================

    //--------------------
    // command handlers
    //--------------------

    _onLoginCommand() {
        this.remoteFileSystem.login();
    }

    _onLogoutCommand() {
        this.remoteFileSystem.logout();
    }

    _onParentFolderSelect() {
        if(this.folderInfo) {
            //get parent id. For root this is not defined, but our load foler method handles that.
            let parentId = this.folderInfo.folder.parentId;
            this._loadFolder(this.selectedDriveId, parentId);
        }
    }

    _onFilterChange() {
        if(this.allRadio.checked) {
           if(this.filter == _allFilter) return; 
           this.filter = _allFilter;
        }
        else if(this.jsonRadio.checked) {
            if(this.filter == _jsonFilter) return;
            this.filter = _jsonFilter;
        }
        else if(this.jsonTextRadio.checked) {
            if(this.filter == _jsonTextFilter) return;
            this.filter = _jsonTextFilter;
        }

        //repopulate the file list
        this._populateFileList();    
    }

    _onFileClick(fileInfo) {
        //select element
        let selectedFileId = fileInfo.fileId;

        //take any needed action
        if(fileInfo.type == fileAccessConstants.FOLDER_TYPE) {
            //open the folder
            this._loadFolder(this.selectedDriveId, selectedFileId);
        }
        else {
            //put the name in the file name field
            if(this.action == fileAccessConstants.SAVE_ACTION) {
                this.saveFileNameField.value = fileInfo.name;
            }
            else if(this.action == fileAccessConstants.OPEN_ACTION) {
                this.openFile(this.selectedDriveId, selectedFileId);
            }
        }

    }

    _onFileDelete(fileInfo) {
        let objectType = (fileInfo.type == fileAccessConstants.FOLDER_TYPE) ? "folder" : "file";
        let okAction = () =>{
            let deletePromise = this.remoteFileSystem.deleteFile(this.selectedDriveId,fileInfo.fileId);
            deletePromise.then( response => {
                //reload folder
                this._loadFolder(this.selectedDriveId,this.folderInfo.folder.fileId,true);
            }).catch(error => {
                let errorMsg = error.message ? error.message : error ? error.toString() : "Unknown";
                apogeeUserAlert("There was an error deleting the " + objectType + ": " + errorMsg);
            })
        }
        apogeeUserConfirm("Are you sure you want to delete the " + objectType + ": " + fileInfo.name + "?","Delete","Cancel",okAction,null,true);
    }

    _onFileRename(fileInfo) {
        let objectType = (fileInfo.type == fileAccessConstants.FOLDER_TYPE) ? "folder" : "file";
        let oldName = fileInfo.name;

        let okAction = formResult =>{
            let fileName = formResult.name;
            if(!fileName) {
                apogeeUserAlert("A name must be entered");
                return false;
            }
            if(fileName == oldName) {
                //no name change
                return true;
            }
            if(this._fileExists(fileName,this.folderInfo)) {
                //notify user and keep dialog opened
                apogeeUserAlert("That name is already in use: " + fileName);
                return false;
            }
            else {
                let renameFilePromise = this.remoteFileSystem.renameFile(this.selectedDriveId,fileInfo.fileId,fileName);
                renameFilePromise.then( response => {
                    //reload folder
                    this._loadFolder(this.selectedDriveId,this.folderInfo.folder.fileId,true);
                }).catch(error => {
                    let errorMsg = error.message ? error.message : error ? error.toString() : "Unknown";
                    apogeeUserAlert("There was an error renaming the file: " + errorMsg);
                })
                //close dialog
                return true;
            }
        }
        let title = `What is the name for the ${objectType}?`;
        _showTextQueryDialog(title,"Name",oldName,okAction);
    }

    _onCreateFolder() {
        let okAction = formResult =>{
            let fileName = formResult.name;
            if(!fileName) {
                apogeeUserAlert("A folder name must be entered");
                return false;
            }
            if(this._fileExists(fileName,this.folderInfo)) {
                //notify user and keep dialog opened
                apogeeUserAlert("That name is already in use: " + fileName);
                return false;
            }
            else {
                let createFolderPromise = this.remoteFileSystem.createFolder(this.selectedDriveId,this.folderInfo.folder.fileId,fileName);
                createFolderPromise.then( response => {
                    //reload folder
                    this._loadFolder(this.selectedDriveId,this.folderInfo.folder.fileId,true);
                }).catch(error => {
                    let errorMsg = error.message ? error.message : error ? error.toString() : "Unknown";
                    apogeeUserAlert("There was an error creating the folder: " + errorMsg);
                })
                //close dialog
                return true;
            }
        }
        let title = "What is the name for the folder?";
        _showTextQueryDialog(title,"Folder Name","",okAction);
    }

    _onSavePress() {
        if(!this.selectedDriveId) {
            apogeeUserAlert("There is no selected drive!");
            return;
        }
        if((!this.folderInfo)||(!this.folderInfo.folder)) {
            apogeeUserAlert("There is no selected folder!");
            return;
        }
        let folderId = this.folderInfo.folder.fileId;
        let fileName = this.saveFileNameField.value.trim();
        if(fileName.length === 0) {
            apogeeUserAlert("No file name is entered");
        }

        let doAction = () => this.createFile(this.selectedDriveId,folderId,fileName);

        if(this._fileExists(fileName,this.folderInfo)) {
            let msg = "There is already a file with that name. Replace it?";
            apogeeUserConfirm(msg,"Replace","Cancel",doAction);
        }
        else {
            doAction();
        }
    }

    _onCancelPress() {
        this.cancelAction();
    }

    /** This function changes the active source */
    _onSelectDrive(driveId) {

        let oldSelectedDriveId = this.selectedDriveId;
        this.selectedDriveId = driveId;

        if(oldSelectedDriveId !== undefined) {
            let oldElement = this.driveSelectionElementMap[oldSelectedDriveId];
            oldElement.classList.remove("remoteFileAccess_driveElementActive");
        }
        if(this.selectedDriveId !== undefined) {
            let newElement = this.driveSelectionElementMap[this.selectedDriveId];
            newElement.classList.add("remoteFileAccess_driveElementActive");

            //store this as default for future use
            _cachedDriveId = driveId;

            //load the initial
            let initialFolderId;
            if((this.initialFileMetadata)&&(this.initialFileMetadata.parentId)) {
                initialFolderId = this.initialFileMetadata.parentId;
            }
            else {
                initialFolderId = _cachedFolderId;
            }
            this._loadFolder(this.selectedDriveId,initialFolderId);
        }
    }

    //---------------------
    //internal methods
    //----------------------

    _setLoginState(loginState) {
        let oldLoginState = this.loginState;
        this.loginState = loginState;
        if(this.configElement) {
            if(loginState.state == fileAccessConstants.LOGGED_IN) {
                this.loginElement.style.display = "none";
                if(loginState.accountName) {
                    this.userElement.innerHTML = loginState.accountName;
                    this.userElement.style.display = "";
                }
                else {
                    this.userElement.style.display = "none";
                }
                this.logoutElement.style.display = "";
                if(loginState.message) {
                    this.accountMsgElement.style.display = "";
                    this.accountMsgElement.innerHTML = loginState.message;
                }
                else {
                    this.accountMsgElement.style.display = "none";
                    this.accountMsgElement.innerHTML = "";
                }

                this.loggedOutShield.style.display = "none";
            }
            else if(loginState.state == fileAccessConstants.LOGGED_OUT) {
                this.loginElement.style.display = "";
                this.userElement.style.display = "none";
                this.userElement.innerHTML = "";
                this.logoutElement.style.display = "none";
                if(loginState.message) {
                    this.accountMsgElement.style.display = "";
                    this.accountMsgElement.innerHTML = loginState.message;
                }
                else {
                    this.accountMsgElement.style.display = "none";
                    this.accountMsgElement.innerHTML = "";
                }
                
                this.loggedOutShield.style.display = "";
            }
            else if(loginState.state == fileAccessConstants.LOGIN_PENDING) {
                //for now we will leave it to this...
                this.accountMsgElement.style.display = "";
                this.accountMsgElement.innerHTML = loginState.message ? loginState.message : "pending";

                this.loginElement.style.display = "none";
                this.userElement.style.display = "none";
                this.userElement.innerHTML = "";
                this.logoutElement.style.display = "none";

                this.loggedOutShield.style.display = "";
            }
            else {
                //handle this
            }
        }

        if((this.loginState.state == fileAccessConstants.LOGGED_IN)&&
            !((oldLoginState)&&(oldLoginState.state == this.loginState.state))&&
            (this.actionElement) ) {
            //populate the action form if we are newly logged in
            this._populateActionForm();
        }
    }

    _setDrivesInfo(drivesInfo) {
        this.drivesInfo = drivesInfo;

        //pick an initial drive
        let atttemptedSelectedDriveId, initialSelectedDriveId;
        if((this.initialFileMetadata)&&(this.initialFileMetadata.fileInfo.driveId)) {
            atttemptedSelectedDriveId = this.initialFileMetadata.fileInfo.driveId;
        }
        else {
            atttemptedSelectedDriveId = _cachedDriveId;
        }

        this.selectedDriveId = undefined;
        this.driveSelectionElementMap = {};
        uiutil.removeAllChildren(this.drivesListElement);

        if(this.drivesInfo) {
            let selectedDriveId; 
            if((this.drivesInfo.drives)&&(this.drivesInfo.drives.length > 0)) {
                this.drivesInfo.drives.forEach( driveInfo => {
                    this._addDriveElement(driveInfo)
                    if(driveInfo.driveId == atttemptedSelectedDriveId) {
                        initialSelectedDriveId = driveInfo.driveId;
                    }
                })

                if((!initialSelectedDriveId)&&(this.drivesInfo.drives.length > 0)) {
                    initialSelectedDriveId = this.drivesInfo.drives[0].driveId;
                }
            }

            //set initial drive state
            if(initialSelectedDriveId) {
                this._onSelectDrive(initialSelectedDriveId);
            }
        }
        
    }

    _loadFolder(driveId, folderId, forceReload) {
        let filesInfoPromise = this.remoteFileSystem.loadFolder(driveId,folderId,forceReload);
        filesInfoPromise.then(folderInfo => {
            this._setFilesInfo(folderInfo);
        }).catch(error => {
            let errorMsg = error.message ? error.message : error ? error.toString() : "Unknown";
            apogeeUserAlert("Error opening folder: " + errorMsg);
            this._setFilesInfo(null);
            //if we failed to find the folder, try to open the root of the given drive
            if(folderId) {
                this._loadFolder(driveId);
            }
        })
    }


    _setFilesInfo(folderInfo) {
        this.folderInfo = folderInfo;
        this.fileElementMap = {};

        this._populatePathCell();
        this._populateFileList();

        //save this folder
        if((folderInfo)&&(folderInfo.folder)&&(folderInfo.folder.fileId)) {
            _cachedFolderId = folderInfo.folder.fileId;
        }

    }

    _populatePathCell() {
        uiutil.removeAllChildren(this.pathElement);
        uiutil.removeAllChildren(this.fileListTable);

        let selectedDriveInfo = this._getSelectedDriveInfo();
        if(selectedDriveInfo) {
            this.pathElement.appendChild(this._getPathDriveElement(selectedDriveInfo));
        }
        if(this.folderInfo) {
            if(this.folderInfo.path) {
                let isFirstEntry = true;
                this.folderInfo.path.forEach( fileInfo => {
                    //don't add the root name. Just use the drive name.
                    if(fileInfo.isRoot) return;
                    //add a delimiter between entries
                    if(isFirstEntry) {
                        isFirstEntry = false;
                    }
                    else {
                        this.pathElement.appendChild(this._getPathDelimiterElement());
                    }
                    this.pathElement.appendChild(this._getPathElement(fileInfo));
                })
            }
        }
        
    }

    _getSelectedDriveInfo() {
        if((this.drivesInfo)&&(this.drivesInfo.drives)&&(this.selectedDriveId)) {
            return this.drivesInfo.drives.find( driveEntry => driveEntry.driveId == this.selectedDriveId);
        }
        else return undefined;
    }

    _populateFileList() {
        uiutil.removeAllChildren(this.fileListTable);
        if((this.folderInfo)&&(this.folderInfo.children)) {
            this.folderInfo.children.filter(this.filter).forEach(folderInfo => this._addFileListEntry(folderInfo));
        }
    }

    _populateActionForm() {
        let drivesInfoPromise = this.remoteFileSystem.getDrivesInfo();
        drivesInfoPromise.then(drivesInfo => {
            this._setDrivesInfo(drivesInfo);
        }).catch(error => {
            //figure out what to do here
            let errorMsg = error.message ? error.message : error ? error.toString() : "Unknown";
            apogeeUserAlert("Error loading drive info: " + errorMsg)
        })
    }

    _fileExists(fileName,folderInfo) {
        if(folderInfo.children) {
            return folderInfo.children.some(childInfo => (childInfo.name == fileName));
        }
        else {
            return false;
        }
    }

    //--------------------
    // create elements
    //--------------------

    _createConfigElement() {
        let container = document.createElement("div");
        container.className = "remoteFileAccess_configContainer";

        this.userElement = document.createElement("div");
        this.userElement.className = "remoteFileAccess_userElement";
        container.appendChild(this.userElement);

        this.accountMsgElement = document.createElement("span");
        this.accountMsgElement.className = "remoteFileAccess_accountMsgElement";
        container.appendChild(this.accountMsgElement);

        let linkContainer = document.createElement("div");
        linkContainer.className = "remoteFileAccess_loginoutContainer";
        container.appendChild(linkContainer);
        this.loginElement = document.createElement("a");
        this.loginElement.className = "remoteFileAccess_loginElement";
        this.loginElement.innerHTML = "Login"
        this.loginElement.onclick = () => this._onLoginCommand();
        linkContainer.appendChild(this.loginElement);

        this.logoutElement = document.createElement("a");
        this.logoutElement.className = "remoteFileAccess_logoutElement";
        this.logoutElement.innerHTML = "Logout"
        this.logoutElement.onclick = () => this._onLogoutCommand();
        linkContainer.appendChild(this.logoutElement);

        //this element is used in the action element, but we will modify it with the login data
        this.loggedOutShield = document.createElement("div");
        this.loggedOutShield.className = "remoteFileAccess_loggedOutShield";
        this.loggedOutShield.innerHTML = "<em>User not logged in</em>"

        let loggedOutCancelButton = document.createElement("button");
        loggedOutCancelButton.innerHTML = "Cancel";
        loggedOutCancelButton.className = "remoteFileAccess_loggedOutCancelButton";
        loggedOutCancelButton.onclick = () => this._onCancelPress();
        this.loggedOutShield.appendChild(loggedOutCancelButton);

        this.configElement = container;
    }


    _createActionElement() {
        //action element
        let mainContainer = document.createElement("table");
        mainContainer.className = "remoteFileAccess_mainContainer";

        let pathRow = document.createElement("tr");
        mainContainer.appendChild(pathRow);
        let fileDisplayRow = document.createElement("tr");
        mainContainer.appendChild(fileDisplayRow);
        let filterRow = document.createElement("tr");
        mainContainer.appendChild(filterRow);
        let fileNameRow = document.createElement("tr");
        mainContainer.appendChild(fileNameRow);
        let buttonsRow = document.createElement("tr");
        mainContainer.appendChild(buttonsRow);

        //drive selection
        let drivesCell = document.createElement("td");
        drivesCell.className = "remoteFileAccess_drivesCell";
        drivesCell.rowSpan = 5;
        pathRow.appendChild(drivesCell);

        let drivesTitleElement = document.createElement("div");
        drivesTitleElement.className = "remoteFileAccess_driveTitle";
        drivesTitleElement.innerHTML = "Drives:"
        drivesCell.appendChild(drivesTitleElement);

        this.drivesListElement = document.createElement("div");
        this.drivesListElement.className = "remoteFileAccess_driveList";
        drivesCell.appendChild(this.drivesListElement);

        //path display and folder commands
        let pathCell = document.createElement("td");
        pathCell.className = "remoteFileAccess_pathCell";
        pathRow.appendChild(pathCell);

        this.pathElement = document.createElement("div");
        this.pathElement.className = "remoteFileAccess_pathElement";
        pathCell.appendChild(this.pathElement);

        //commands - parent folder, file type filter, add folder (for save only)
        let commandElement = document.createElement("div");
        commandElement.className = "remoteFileAccess_commandElement";
        pathCell.appendChild(commandElement);

        let parentFolderButton = document.createElement("button");
        parentFolderButton.className = "remoteFileAccess_folderCommandButton";
        let parentFolderImage = document.createElement("img");
        parentFolderImage.src = uiutil.getResourcePath(fileAccessConstants.PARENT_FOLDER_IMAGE,"combined-file-access");
        parentFolderButton.appendChild(parentFolderImage);
        parentFolderButton.title = "Go To Parent Folder";
        parentFolderButton.onclick = () => this._onParentFolderSelect();
        commandElement.appendChild(parentFolderButton);
        if(this.action == fileAccessConstants.SAVE_ACTION) {
            let addFolderButton = document.createElement("button");
            addFolderButton.className = "remoteFileAccess_folderCommandButton";
            let addFolderImage = document.createElement("img");
            addFolderImage.src = uiutil.getResourcePath(fileAccessConstants.ADD_FOLDER_IMAGE,"combined-file-access");
            addFolderButton.appendChild(addFolderImage);
            addFolderButton.title = "Add New Folder";
            addFolderButton.onclick = () => this._onCreateFolder();
            commandElement.appendChild(addFolderButton);
        }
        
        //file display list
        let fileListCell = document.createElement("td");
        fileListCell.className = "remoteFileAccess_fileListCell";
        fileDisplayRow.appendChild(fileListCell);

        this.fileListTable = document.createElement("table");
        this.fileListTable.className = "remoteFileAccess_fileListTable";
        fileListCell.appendChild(this.fileListTable);

        //file filter row
        let filterCell = document.createElement("div");
        filterCell.className = "remoteFileAccess_filterCell";
        filterRow.appendChild(filterCell);
        
        let fileFilterLabel = document.createElement("span");
        fileFilterLabel.innerHTML = "Show Files: "
        filterCell.appendChild(fileFilterLabel);
        let radioGroupName = apogeeutil.getUniqueString();
        let allId = apogeeutil.getUniqueString();
        let jsonId = apogeeutil.getUniqueString();
        let jsonTextId = apogeeutil.getUniqueString();

        this.allRadio = document.createElement("input");
        this.allRadio.id = allId;
        this.allRadio.type = "radio";
        this.allRadio.name = radioGroupName;
        this.allRadio.value = "all";
        this.allRadio.checked = (this.filter == _allFilter);
        this.allRadio.onclick = () => this._onFilterChange();
        filterCell.appendChild(this.allRadio);
        let allRadioLabel = document.createElement("label");
        allRadioLabel.for = allId;
        allRadioLabel.innerHTML = "All";
        allRadioLabel.className = "remoteFileAccess_filterCheckboxLabel";
        filterCell.appendChild(allRadioLabel);

        this.jsonRadio = document.createElement("input");
        this.jsonRadio.id = jsonId;
        this.jsonRadio.type = "radio";
        this.jsonRadio.name = radioGroupName;
        this.jsonRadio.value = "json";
        this.jsonRadio.checked = (this.filter == _jsonFilter);
        this.jsonRadio.onclick = () => this._onFilterChange();
        filterCell.appendChild(this.jsonRadio);
        let jsonRadioLabel = document.createElement("label");
        jsonRadioLabel.for = jsonId;
        jsonRadioLabel.innerHTML = "JSON Only";
        jsonRadioLabel.className = "remoteFileAccess_filterCheckboxLabel";
        filterCell.appendChild(jsonRadioLabel);

        this.jsonTextRadio = document.createElement("input");
        this.jsonTextRadio.id = jsonTextId;
        this.jsonTextRadio.type = "radio";
        this.jsonTextRadio.name = radioGroupName;
        this.jsonTextRadio.value = "jsontext";
        this.jsonTextRadio.checked = (this.filter == _jsonTextFilter);
        this.jsonTextRadio.onclick = () => this._onFilterChange();
        filterCell.appendChild(this.jsonTextRadio);
        let jsonTextRadioLabel = document.createElement("label");
        jsonTextRadioLabel.for = jsonTextId;
        jsonTextRadioLabel.innerHTML = "JSON & Text Only";
        jsonTextRadioLabel.className = "remoteFileAccess_filterCheckboxLabel";
        filterCell.appendChild(jsonTextRadioLabel);

        //file name entry
        let fileNameCell = document.createElement("td");
        fileNameCell.className = "remoteFileAccess_fileNameCell";
        fileNameRow.appendChild(fileNameCell);

        if(this.action == fileAccessConstants.SAVE_ACTION) {
            let fileNameLabel = document.createElement("span");
            fileNameLabel.className = "remoteFileAccess_fileNameLabel";
            fileNameLabel.innerHTML = "File Name:";
            fileNameCell.appendChild(fileNameLabel);

            //save has a text field to enter file name
            this.saveFileNameField = document.createElement("input");
            this.saveFileNameField.type = "text";
            this.saveFileNameField.className = "remoteFileAccess_saveFileNameField";
            fileNameCell.appendChild(this.saveFileNameField);

            if((this.initialFileMetadata)&&(this.initialFileMetadata.name)) {
                //initialize name if it is available
                this.saveFileNameField.value = this.initialFileMetadata.name
            }
        }

        //save/open, cancel buttons
        let buttonsCell = document.createElement("td");
        buttonsCell.className = "remoteFileAccess_buttonsCell";
        buttonsRow.appendChild(buttonsCell);

        if(this.action == fileAccessConstants.SAVE_ACTION) {
            let submitButton = document.createElement("button");
            submitButton.innerHTML = "Save";
            submitButton.className = "remoteFileAccess_submitButton";
            submitButton.onclick = () => this._onSavePress();
            buttonsCell.appendChild(submitButton);
        }
        
        let cancelButton = document.createElement("button");
        cancelButton.innerHTML = "Cancel";
        cancelButton.className = "remoteFileAccess_cancelButton";
        cancelButton.onclick = () => this._onCancelPress();
        buttonsCell.appendChild(cancelButton);

        //add the logged out shield - made earlier
        //we are putting it in like this so we can place it beblow the cancle button, but above everything else.
        let shieldParent = document.createElement("div");
        shieldParent.className = "remoteFileAccess_shieldParent";
        mainContainer.appendChild(shieldParent);

        shieldParent.appendChild(this.loggedOutShield);

        this.actionElement = mainContainer;
    }

    /** This function sets of the source selection items */
    _addDriveElement(driveInfo) {
        let driveElement = document.createElement("div");
        driveElement.className = "remoteFileAccess_driveElement";
        driveElement.innerHTML = driveInfo.name;
        driveElement.onclick = () => this._onSelectDrive(driveInfo.driveId);

        this.driveSelectionElementMap[driveInfo.driveId] = driveElement;
        this.drivesListElement.appendChild(driveElement);
    }


    _getPathDriveElement(driveEntry) {
        let driveElement = document.createElement("span");
        driveElement.className = "remoteFileAccess_pathDriveElement";
        driveElement.innerHTML = driveEntry.name + ":";
        return driveElement;
    }

    _getPathDelimiterElement() {
        let delimiterElement = document.createElement("span");
        delimiterElement.className = "remoteFileAccess_pathDelimiterElement";
        delimiterElement.innerHTML = ">";
        return delimiterElement;
    }

    _getPathElement(fileInfo) {
        let folderName;
        if(fileInfo === fileAccessConstants.BROKEN_PATH_ENTRY) {
            folderName = "...";
        }
        else {
            folderName = fileInfo.name;
        }

        let folderElement = document.createElement("span");
        folderElement.className = "remoteFileAccess_pathFileElement";
        folderElement.innerHTML = folderName;
        return folderElement;
    }

    _addFileListEntry(fileInfo) {
        let fileRow = document.createElement("tr");
        fileRow.className = "remoteFileAccess_fileRow";
        let fileIconCell = document.createElement("td");
        fileIconCell.className = "remoteFileAccess_fileIconCell";
        fileRow.appendChild(fileIconCell);
        let fileIcon = document.createElement("img");
        fileIcon.src = this._getIconUrl(fileInfo.type);
        fileIconCell.appendChild(fileIcon);

        let fileNameCell = document.createElement("td");
        fileNameCell.className = "remoteFileAccess_fileNameCell";
        fileRow.appendChild(fileNameCell);

        let fileLink = document.createElement("a");
        fileLink.innerHTML = fileInfo.name;
        fileLink.onclick = () => this._onFileClick(fileInfo);
        fileNameCell.appendChild(fileLink);

        if(fileInfo.type == fileAccessConstants.FOLDER_TYPE) {
            fileLink.className = "remoteFileAccess_fileLinkFolder";
        }
        else if(this.action == fileAccessConstants.OPEN_ACTION) {
            fileLink.className = "remoteFileAccess_fileLinkFileOpen";
        }
        else if(this.action == fileAccessConstants.SAVE_ACTION) {
            fileLink.className = "remoteFileAccess_fileLinkFileSave";
        }

        let fileMimeCell = document.createElement("td");
        fileMimeCell.className = "remoteFileAccess_fileMimeCell";
        if(fileInfo.type != fileAccessConstants.FOLDER_TYPE) fileMimeCell.innerHTML = fileInfo.type;
        fileRow.appendChild(fileMimeCell);

        let fileCmdCell = document.createElement("td");
        fileCmdCell.className = "remoteFileAccess_fileCmdCell";
        fileRow.appendChild(fileCmdCell);

        let renameButton = document.createElement("button");
        renameButton.className = "remoteFileAccess_renameButton";
        renameButton.innerHTML = "Rename";
        renameButton.onclick = () => this._onFileRename(fileInfo);
        fileCmdCell.appendChild(renameButton);
        let deleteButton = document.createElement("button");
        deleteButton.className = "remoteFileAccess_deleteButton";
        deleteButton.innerHTML = "Delete";
        deleteButton.onclick = () => this._onFileDelete(fileInfo);
        fileCmdCell.appendChild(deleteButton);

        
        this.fileElementMap[fileInfo.fileId] = fileRow;

        this.fileListTable.appendChild(fileRow);
    }

    _getIconUrl(mimeType) {
        let resourceName = fileAccessConstants.ICON_MAP[mimeType];
        if(resourceName === undefined) {
            resourceName = fileAccessConstants.DEFAULT_MIME_ICON;
        }
        return uiutil.getResourcePath(resourceName,"combined-file-access");
    }

}

//These values are saved as defaults for the next time the dialog is used.
let _cachedDriveId = null;
let _cachedFolderId = null;

//filters
const JSON_MIME_TYPE = "application/json";
const TEXT_MIME_TYPE = "text/plain";

let _allFilter = fileInfo => true;
let _jsonFilter = fileInfo => ((fileInfo.type == fileAccessConstants.FOLDER_TYPE)||(fileInfo.type == JSON_MIME_TYPE));
let _jsonTextFilter = fileInfo => ((fileInfo.type == fileAccessConstants.FOLDER_TYPE)||(fileInfo.type == JSON_MIME_TYPE)||(fileInfo.type == TEXT_MIME_TYPE));


/** This  function shows a dialog with a title and an input text field. It has a submit button
 * and a cancel button. The submit button action should be specified. By default the cancel button
 * just closes the dialog but an additional action can optionally be specified.
 */
function _showTextQueryDialog(title,textFieldLabel,initialValue,onSubmit,optionalOnCancel) {
    let layout = [
        {
            type: "heading",
            text: title,
            level: 3
        },
        {
            type: "textField",
            label: textFieldLabel + ": ",
            size: 40,
            key: "name",
            value: initialValue,
            focus: true
        }
    ]
    showConfigurableDialog(layout,onSubmit,optionalOnCancel);
}