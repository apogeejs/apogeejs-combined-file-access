export const LOGIN_PENDING = "pending";
export const LOGGED_IN = "logged in";
export const LOGGED_OUT = "logged out";
export const FOLDER_TYPE = "__folder__";

export const STATE_INFO_LOGGED_OUT = {
    state: LOGGED_OUT
}

// const STATE_INFO_LOGGED_IN = {
//     state: fileAccessConstants.LOGGED_IN,
//     accountName: (LOGIN NAME GOES HERE)
// }

export const STATE_INFO_LOGIN_PENDING = {
    state: LOGIN_PENDING,
    message: "login pending"
}

export const STATE_INFO_LOGOUT_PENDING = {
    state: LOGIN_PENDING,
    message: "logout pending"
}

export const SAVE_ACTION = "save";

export const OPEN_ACTION = "open";

/** This will be used as the file info for the path when the data is not available. */
export const BROKEN_PATH_ENTRY = {};

//===================
// file icons
//===================

export const ICON_MAP = {
    "__folder__": "/folderFileIcon.png",
    "application/json": "/jsonFileIcon.png",
    "application/javascript": "/jsFileIcon.png",
    "text/plain": "/textFileIcon.png"
};

export const DEFAULT_MIME_ICON = "/genericFileIcon.png"; 

export const PARENT_FOLDER_IMAGE = "/parentfolder.png";
export const ADD_FOLDER_IMAGE = "/addfolder.png";
