sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageBox",
    "sap/ui/core/Fragment",
    "sap/ui/core/BusyIndicator"
], function (Controller, MessageBox, Fragment, BusyIndicator) {
    "use strict";

    return Controller.extend("ui5.decimal.bug.controller.Homepage", {
        onEditProduct: function () {
            const oSelectedItem = this.getView().byId("tblProducts").getSelectedItem();

            if (!oSelectedItem) {
                MessageBox.error("Please select a record on the table!");
                return;
            }

            this._openProductEditDialog(oSelectedItem.getBindingContext());
        },

        onSaveEditProduct: function () {
            const oModel = this.getView().getModel();

            if (!oModel.hasPendingChanges()) {
                MessageBox.error("No change has been made!");
                return;
            }

            BusyIndicator.show(0);

            oModel.submitChanges({
                success: () => {
                    BusyIndicator.hide();
                    this._editProductDialog.close();
                    MessageBox.information(JSON.stringify(oModel.getPendingChanges()));
                },
                error: () => {
                    BusyIndicator.hide();
                    MessageBox.error("An unexpected error has occured!");
                }
            });
        },

        onCancelEditProduct: function () {
            this._cancelEditProduct();
        },

        onEditProductDialogESC: function (event) {
            event.reject();
            this._cancelEditProduct();
        },

        _openProductEditDialog: async function (oContext) {
            BusyIndicator.show(0);

            if (!this._editProductDialog) {
                this._editProductDialog = await Fragment.load({
                    id: this.getView().getId(),
                    controller: this,
                    name: "ui5.decimal.bug.fragments.EditProductDialog"
                });

                this.getView().addDependent(this._editProductDialog);
            }

            this._editProductDialog.open();
            this._editProductDialog.setBindingContext(oContext);

            BusyIndicator.hide();
        },

        _cancelEditProduct: function () {
            this.getView().getModel().resetChanges();
            this._editProductDialog.close();
        }
    });
});