"use strict";
self["webpackHotUpdatelanfile_pc"]("main",{

/***/ "./src/renderer/App.tsx":
/*!******************************!*\
  !*** ./src/renderer/App.tsx ***!
  \******************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! react */ "./node_modules/react/index.js");
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _components_layout_Header_Header__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./components/layout/Header/Header */ "./src/renderer/components/layout/Header/Header.tsx");
/* harmony import */ var _components_features_FileTransfer_FileTransfer__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./components/features/FileTransfer/FileTransfer */ "./src/renderer/components/features/FileTransfer/FileTransfer.tsx");
/* harmony import */ var _components_features_LanDevices_LanDevices__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./components/features/LanDevices/LanDevices */ "./src/renderer/components/features/LanDevices/LanDevices.tsx");




const App = () => {
    const [files] = (0,react__WEBPACK_IMPORTED_MODULE_0__.useState)([
        { name: "document.pdf", status: "completed" },
        { name: "image.jpg", status: "in-progress" },
    ]);
    const [devices] = (0,react__WEBPACK_IMPORTED_MODULE_0__.useState)([
        { name: "Living Room PC", status: "online" },
        { name: "Kitchen Tablet", status: "offline" },
        { name: "Bedroom Laptop", status: "online" },
    ]);
    return (react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", { className: "min-h-screen bg-gray-100" },
        react__WEBPACK_IMPORTED_MODULE_0___default().createElement(_components_layout_Header_Header__WEBPACK_IMPORTED_MODULE_1__["default"], { currentDevice: "Current Device", onSettingsClick: () => console.log("Settings clicked"), onHelpClick: () => console.log("Help clicked") }),
        react__WEBPACK_IMPORTED_MODULE_0___default().createElement("main", { className: "py-6 mx-auto max-w-7xl sm:px-6 lg:px-8" },
            react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", { className: "grid grid-cols-1 gap-6 lg:grid-cols-2" },
                react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", null,
                    react__WEBPACK_IMPORTED_MODULE_0___default().createElement(_components_features_FileTransfer_FileTransfer__WEBPACK_IMPORTED_MODULE_2__["default"], { files: files, onUpload: () => console.log("Upload clicked"), onDownload: () => console.log("Download clicked") })),
                react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", null,
                    react__WEBPACK_IMPORTED_MODULE_0___default().createElement(_components_features_LanDevices_LanDevices__WEBPACK_IMPORTED_MODULE_3__["default"], { devices: devices, onRefresh: () => console.log("Refresh clicked"), onDeviceSelect: (device) => console.log("Selected device:", device) }))))));
};
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (App);


/***/ })

},
/******/ function(__webpack_require__) { // webpackRuntimeModules
/******/ /* webpack/runtime/getFullHash */
/******/ (() => {
/******/ 	__webpack_require__.h = () => ("0af6ee4802813fdf6871")
/******/ })();
/******/ 
/******/ }
);
//# sourceMappingURL=main.6009a24e0c1e014f514b.hot-update.js.map