sap.ui.define([
	'jquery.sap.global',
	'sap/ui/core/mvc/Controller',
	'sap/demo/bpmrulesshoppingcart/model/formatter',
	'sap/m/MessageToast',
	'sap/m/MessageBox'
], function ($, Controller, formatter, MessageToast, MessageBox) {
	return Controller.extend("sap.demo.bpmrulesshoppingcart.view.Product", {
		formatter: formatter,

		onInit: function () {
			var oComponent = this.getOwnerComponent();

			this._router = oComponent.getRouter();
			this._router.getRoute("product").attachPatternMatched(this._routePatternMatched, this);
			this._router.getRoute("cartProduct").attachPatternMatched(this._routePatternMatched, this);

			// register for events
			var oBus = sap.ui.getCore().getEventBus();
			oBus.subscribe("shoppingCart", "updateProduct", this.fnUpdateProduct, this);
		},

		_routePatternMatched: function (oEvent) {
			var sId = oEvent.getParameter("arguments").productId,
				oView = this.getView(),
				sPath = "/Products('" + sId + "')";

			var oModel = oView.getModel();
			var oData = oModel.getData(sPath);
			oView.bindElement({
				path: sPath,
				events: {
					dataRequested: function () {
						oView.setBusy(true);
					},
					dataReceived: function () {
						oView.setBusy(false);
					}
				}
			});
			//if there is no data the model has to request new data
			if (!oData) {
				oView.setBusyIndicatorDelay(0);
				oView.getElementBinding().attachEventOnce("dataReceived", function () {
					// reset to default
					oView.setBusyIndicatorDelay(null);
					this._checkIfProductAvailable(sPath, sId);
				}.bind(this));
			}
		},

		fnUpdateProduct: function (sChannel, sEvent, oData) {
			var sPath = "/Products('" + oData.productId + "')";
			this.getView().bindElement(sPath);
			this._checkIfProductAvailable(sPath, oData.productId);
		},

		_checkIfProductAvailable: function (sPath, sId) {
			var oModel = this.getView().getModel();
			var oData = oModel.getData(sPath);

			// show not found page
			if (!oData) {
				this._router.getTargets().display("notFound", sId);
			}
		},

		handleAddButtonPress: function () {
			var oBundle = this.getOwnerComponent().getModel("i18n").getResourceBundle();
			var oProduct = this.getView().getBindingContext().getObject();
			var sProdStatus = oProduct.status;
			var that = this;

			switch (sProdStatus) {
			case "D":
				//show message dialog
				MessageBox.show(
					oBundle.getText("PRODUCT_STATUS_DISCONTINUED_MSG"), {
						icon: MessageBox.Icon.ERROR,
						titles: oBundle.getText("PRODUCT_STATUS_DISCONTINUED_TITLE"),
						actions: [MessageBox.Action.CLOSE]
					});
				break;
			case "O":
				// show message dialog
				MessageBox.show(
					oBundle.getText("PRODUCT_STATUS_OUT_OF_STOCK_MSG"), {
						icon: MessageBox.Icon.QUESTION,
						title: oBundle.getText("PRODUCT_STATUS_OUT_OF_STOCK_TITLE"),
						actions: [MessageBox.Action.OK, MessageBox.Action.CANCEL],
						onClose: function (oAction) {
							// order
							if (MessageBox.Action.OK === oAction) {
								that._addProduct(oProduct);
							}
						}
					});
				break;
			case "A":
				this._addProduct(oProduct);
				break;
			default:
				this._addProduct(oProduct);
				break;
			}
		},

		_addProduct: function (oProductToBeAdded) {
			var oCartModel = this.getView().getModel("cartProducts");
			var oCartData = oCartModel.getData();
			var oCartEntries = oCartData.cartEntries;

			// find existing entry for product
			var sProductIdToBeAdded = oProductToBeAdded.Name;
			var oCartEntry = oCartEntries[sProductIdToBeAdded];

			if (oCartEntry === undefined) {
				// create new entry
				oCartEntry = $.extend({}, oProductToBeAdded);
				oCartEntry.Quantity = 1;
				oCartEntry.Name = oProductToBeAdded.Name;
				oCartEntry.UnitPrice = oProductToBeAdded.Price;
				oCartEntry.Soldby = oProductToBeAdded.SupplierName;
				oCartEntries[sProductIdToBeAdded] = oCartEntry;
			} else {
				// update existing entry
				oCartEntry.Quantity += 1;
			}

			var oRuleModel = this.getView().getModel("ruleInputPayload");
			var oRulesModelEntries = oRuleModel.getData().ruleModelEntries;
			var oModel = [];

			var sProductCatToBeAdded = oProductToBeAdded.Category;
			var sProductSoldbyToBeAdded = oProductToBeAdded.SupplierName;
			var arrayIndexing = sProductCatToBeAdded + "-" + sProductSoldbyToBeAdded;
			var oRuleModelEntry = oRulesModelEntries[arrayIndexing];
			if (oRuleModelEntry === undefined) {
				// create new entry
				oRuleModelEntry = {};
				oRuleModelEntry.__type__ = "Product";
				oRuleModelEntry.Category = oProductToBeAdded.Category;
				oRuleModelEntry.Quantity = 1;
				oRuleModelEntry.Soldby = oProductToBeAdded.SupplierName;
				oModel.push(oRuleModelEntry);

				var oSellerModelEntry = {};
				oSellerModelEntry.__type__ = "Seller";
				oSellerModelEntry.Name = oProductToBeAdded.SupplierName;
				oModel.push(oSellerModelEntry);

				oRulesModelEntries[arrayIndexing] = oModel;
			} else {
				// update existing entry
				oRulesModelEntries[arrayIndexing][0].Quantity += 1;
			}

			//if there is at least one entry, the edit button is shown
			oCartData.showEditAndProceedButton = true;

			// update model
			oCartModel.refresh(true);

			var oBundle = this.getOwnerComponent().getModel("i18n").getResourceBundle();
			MessageToast.show(oBundle.getText("PRODUCT_MSG_ADDED_TO_CART"));
		},

		handleCartButtonPress: function () {
			this._router.navTo("cart");
		},

		handleNavButtonPress: function () {
			this.getOwnerComponent().myNavBack();
		}

	});
});