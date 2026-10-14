sap.ui.define([
    "sap/ui/core/UIComponent",
    "ui5/decimal/bug/model/models"
], function (UIComponent, models) {
    "use strict";

    return UIComponent.extend("ui5.decimal.bug.Component", {
        metadata: {
            manifest: "json"
        },

        init: function () {
            UIComponent.prototype.init.apply(this, arguments);
            this.setModel(models.createDeviceModel(), "device");
            this.getRouter().initialize();
        }
    });
});