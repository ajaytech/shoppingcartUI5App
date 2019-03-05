sap.ui.define([
	'sap/ui/core/mvc/Controller',
	'sap/ui/model/json/JSONModel',
	'sap/ui/Device',
	'sap/demo/bpmrulesshoppingcart/model/formatter',
	'sap/m/MessageBox',
	'sap/m/MessageToast',
	'sap/m/Dialog',
	'sap/m/Button'
], function (
	Controller,
	JSONModel,
	Device,
	formatter,
	MessageBox,
	MessageToast,
	Dialog,
	Button) {
	var sCartModelName = "cartProducts";
	var sRulesInputModelName = "ruleInputPayload";
	var oController;
	var oThisView;
	var _orderDialog;
	var _orderBusyDialog;

	return Controller.extend("sap.demo.bpmrulesshoppingcart.view.Cart", {
		formatter: formatter,

		onInit: function () {
			oController = this;
			this._router = sap.ui.core.UIComponent.getRouterFor(this);
			this._router.getRoute("cart").attachPatternMatched(this._routePatternMatched, this);

			// set initial ui configuration model
			var oCfgModel = new JSONModel({});
			this.getView().setModel(oCfgModel, "cfg");
			this._toggleCfgModel();
		},

		onExit: function () {
			if (this._orderDialog) {
				this._orderDialog.destroy();
			}
			if (this._orderBusyDialog) {
				this._orderBusyDialog.destroy();
			}
		},

		_routePatternMatched: function () {
			//set selection of list back
			var oEntryList = this.getView().byId("entryList");
			oEntryList.removeSelections();
		},

		handleEditOrDoneButtonPress: function () {
			this._toggleCfgModel();
		},

		_toggleCfgModel: function () {
			var oCfgModel = this.getView().getModel("cfg");
			var oData = oCfgModel.getData();
			var bDataNoSetYet = !oData.hasOwnProperty("inDelete");
			var bInDelete = (bDataNoSetYet) ? true : oData.inDelete;
			var oBundle = this.getOwnerComponent().getModel("i18n").getResourceBundle();
			oCfgModel.setData({
				inDelete: !bInDelete,
				notInDelete: bInDelete,
				listMode: bInDelete ? Device.system.phone ? "None" : "SingleSelectMaster" : "Delete",
				listItemType: bInDelete ? Device.system.phone ? "Active" : "Inactive" : "Inactive",
				pageTitle: (bInDelete) ? oBundle.getText("CART_TITLE_DISPLAY") : oBundle.getText("CART_TITLE_EDIT")
			});
		},

		handleNavButtonPress: function () {
			this.getOwnerComponent().myNavBack();
		},

		handleEntryListPress: function (oEvent) {
			this._showProduct(oEvent.getSource());
		},

		handleEntryListSelect: function (oEvent) {
			this._showProduct(oEvent.getParameter("listItem"));
		},

		onSaveForLater: function (oEvent) {
			var oBindingContext = oEvent.getSource().getBindingContext(sCartModelName);
			var oModelData = oBindingContext.getModel().getData();

			var oListToAddItem = oModelData.savedForLaterEntries;
			var oListToDeleteItem = oModelData.cartEntries;
			this._changeList(oListToAddItem, oListToDeleteItem, oEvent);
		},

		onAddBackToCart: function (oEvent) {
			var oBindingContext = oEvent.getSource().getBindingContext(sCartModelName);
			var oModelData = oBindingContext.getModel().getData();

			var oListToAddItem = oModelData.cartEntries;
			var oListToDeleteItem = oModelData.savedForLaterEntries;
			this._changeList(oListToAddItem, oListToDeleteItem, oEvent);
		},

		_changeList: function (oListToAddItem, oListToDeleteItem, oEvent) {
			var oBindingContext = oEvent.getSource().getBindingContext(sCartModelName);
			var oCartModel = this.getView().getModel(sCartModelName);
			var oProduct = oBindingContext.getObject();
			var sProductId = oProduct.ProductId;

			// find existing entry for product
			if (oListToAddItem[sProductId] === undefined) {
				// copy new entry
				oListToAddItem[sProductId] = oProduct;
			}

			//Delete the saved Product from cart
			delete oListToDeleteItem[sProductId];
			// update model
			oCartModel.refresh(true);
		},

		_showProduct: function (item) {
			// send event to refresh
			var sPath = item.getBindingContext(sCartModelName).getPath();
			var oEntry = this.getView().getModel(sCartModelName).getProperty(sPath);
			var sId = oEntry.ProductId;
			if (!sap.ui.Device.system.phone) {
				this._router.getTargets().display("productView");
				var bus = sap.ui.getCore().getEventBus();
				bus.publish("shoppingCart", "updateProduct", {
					productId: sId
				});
			} else {
				this._router.navTo("cartProduct", {
					productId: sId
				});
			}
		},

		handleEntryListDelete: function (oEvent) {
			// show confirmation dialog
			var sEntry = oEvent.getParameter("listItem").getBindingContext(sCartModelName).getObject();
			var sEntryId = sEntry.ProductId;
			var sEntryCategory = sEntry.Category;
			var sEntrySeller = sEntry.SupplierName;
			var sEntryQuantity = sEntry.Quantity;

			var oBundle = this.getOwnerComponent().getModel("i18n").getResourceBundle();
			MessageBox.show(
				oBundle.getText("CART_DELETE_DIALOG_MSG"), {
					title: oBundle.getText("CART_DELETE_DIALOG_TITLE"),
					actions: [MessageBox.Action.DELETE, MessageBox.Action.CANCEL],
					onClose: jQuery.proxy(function (oAction) {
						if (MessageBox.Action.DELETE === oAction) {
							var oModel = this.getView().getModel(sCartModelName);
							var oData = oModel.getData();

							var cartEntriesObj = oData.cartEntries;
							var array = $.map(cartEntriesObj, function (value, index) {
								return [value];
							});

							var aNewEntries = jQuery.grep(array, function (oEntry) {
								var keep = (oEntry.ProductId !== sEntryId);
								if (!keep) {
									oData.totalPrice = parseFloat(oData.totalPrice).toFixed(2) - parseFloat(oEntry.Price).toFixed(2) * oEntry.Quantity;
								}
								return keep;
							});

							oData.cartEntries = $.extend({}, aNewEntries);
							oData.showEditAndProceedButton = aNewEntries.length > 0;
							oModel.setData(oData);

							// Refresh Rules Model List to update the Quantity
							var oRulesModel = this.getView().getModel(sRulesInputModelName);
							var oRulesData = oRulesModel.getData();
							var ruleEntriesObj = oRulesData.ruleModelEntries;
							var index = sEntryCategory + "-" + sEntrySeller;
							var deletedEntry = ruleEntriesObj[index];

							var sQuantity = deletedEntry[0].Quantity;
							var newQuantity = sQuantity - sEntryQuantity;
							ruleEntriesObj[index][0].Quantity = newQuantity;

							oRulesData.oRulesModelEntries = ruleEntriesObj;
							oRulesModel.setData(oRulesData);
						}
					}, this)
				});
		},

		handleProceedButtonPress: function (oEvent) {
			var that = this;

			// create busy dialog
			var oBundle = this.getOwnerComponent().getModel("i18n").getResourceBundle();
			_orderBusyDialog = new sap.m.BusyDialog({});
			_orderBusyDialog.open();

			oThisView = this.getView();
			var orderValueModel = new sap.ui.model.json.JSONModel();
			var oInputView;
			var payloadDisc;

			var token;
			var resultDis;
			//Hardcoded code removed
			var payload = [];
			var data = this.getView().getModel("cartProducts").getData();
			data = data.cartEntries;
			var arraryCart = $.makeArray(data);

			$.map(arraryCart[0], function (val, i) {

				payload.push({
					"__type__": "Product",
					"Category": val.Category,
					"Quantity": val.Quantity,
					"SoldBy": val.Soldby,
					"UnitPrice": val.UnitPrice

				});

			});

			payloadDisc = JSON.stringify(payload);
			
			sap.ui.getCore().setModel(this.getView().getModel("cartProducts"),"modelCart");

			$.ajax({
				url: "/bpmrulesruntime/rules-service/v1/rules/xsrf-token",
				method: "GET",
				async: false,
				headers: {
					"X-CSRF-Token": "Fetch"
				},
				success: function (result, xhr, data) {
					token = data.getResponseHeader("X-CSRF-Token");
					var products=sap.ui.getCore().getModel("modelCart").getData();
					
					$.ajax({
						url: " /bpmrulesruntime/rules-service/rest/v1/rule-services/java/ecommerceOffers/dailyDiscountSRV",
						method: "POST",
						contentType: "application/json",
						data: payloadDisc,
						async: false,
						headers: {
							"X-CSRF-Token": token
						},
						success: function (result1, xhr1, data1) {
							var arrayCart = $.makeArray(products.cartEntries);
							arrayCart[0]["Discount"]=result1[0]["Discount"];

							_orderBusyDialog.close();
						},
						error: function (result1, xhr1, data1) {
							_orderBusyDialog.close();
						}
					});

				},
				error: function (result1, xhr1, data1) {
					_orderBusyDialog.close();
				}
			});

			/*var shipmentDetails = [{
				"ProductId": "HT-1063",
				"Category": "Keyboards",
				"MainCategory": "Computer Components",
				"SupplierName": "Oxynum",
				"Weight": "2.1",
				"WeightUnit": "KG",
				"ShortDescription": "Ergonomic USB Keyboard for Desktop, Plug&Play",
				"Name": "Ergonomic Keyboard",
				"PictureUrl": "img/product/HT-1063.jpg",
				"Status": "D",
				"Price": "14",
				"DimensionWidth": "50",
				"DimensionDepth": "21",
				"DimensionHeight": "3.5",
				"Unit": "cm",
				"CurrencyCode": "EUR",
				"__metadata": {
					"id": "/sap/opu/odata/IWBEP/EPM_DEVELOPER_SCENARIO_SRV/Products('HT-1063')",
					"type": "EPM_DEVELOPER_SCENARIO_SRV.Product",
					"uri": "/sap/opu/odata/IWBEP/EPM_DEVELOPER_SCENARIO_SRV/Products('HT-1063')"
				},
				"Quantity": 1,
				"UnitPrice": "14",
				"Soldby": "Oxynum",
				"__type__": "Product",
				"Discount": 0,
				"TotalPrice": "14.00",
				"ShipmentCost": 200,
				"ShipmentTime": "2 Days",
				"GrossPrice": 214
			}];
			orderValueModel.setData({
				modeldata: shipmentDetails
			});
*/
	// create order dialog
					oInputView = sap.ui.view({
						//id: "Order",
						viewName: "sap.demo.bpmrulesshoppingcart.view.Order",
						type: "XML",
						viewData: orderValueModel
					});

					_orderDialog = new Dialog({
						title: oBundle.getText("CART_ORDER_DIALOG_TITLE"),
						stretch: Device.system.phone,
						content: [
							oInputView
						],
						leftButton: new Button({
							text: oBundle.getText("CART_ORDER_DIALOG_CONFIRM_ACTION"),
							type: "Accept",
							press: function() {
								var bInputValid = oInputView.getController()._checkInput();
								if (bInputValid) {
									_orderDialog.close();
									var msg = "Your order was placed.";
									that._resetCart();
									MessageToast.show(msg, {});
								}
							}
						}),
						rightButton: new Button({
							text: oBundle.getText("DIALOG_CANCEL_ACTION"),
							press: function() {
								_orderDialog.close();
							}
						})
					});

					oThisView.addDependent(_orderDialog);

					// open order dialog
					_orderDialog.open();
		},

		_resetCart: function () {
			//delete cart content
			var oCartProductsModel = this.getView().getModel(sCartModelName);
			var oCartProductsModelData = oCartProductsModel.getData();
			oCartProductsModelData.cartEntries = {};
			oCartProductsModelData.totalPrice = "0";
			oCartProductsModelData.showEditAndProceedButton = false;
			oCartProductsModel.setData(oCartProductsModelData);
			this._router.navTo("home");
			if (!Device.system.phone) {
				this._router.getTargets().display("welcome");
			}
		}
	});
});