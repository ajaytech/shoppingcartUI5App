sap.ui.define([
	"sap/ui/core/UIComponent",
	"sap/ui/Device",
	'sap/m/routing/Router',
	'sap/ui/model/resource/ResourceModel',
	'sap/ui/model/odata/ODataModel',
	'sap/ui/model/json/JSONModel',
	"sap/demo/bpmrulesshoppingcart/model/models"
], function (UIComponent,
			Device,
			Router,
			ResourceModel,
			ODataModel,
			JSONModel,
			models) {

	return UIComponent.extend("sap.demo.bpmrulesshoppingcart.Component", {

		metadata: {
			includes : ["css/style.css"],
			routing: {
				config: {
					routerClass: Router,
					viewType: "XML",
					viewPath: "sap.demo.bpmrulesshoppingcart.view",
					controlId: "splitApp",
					transition: "slide",
					bypassed: {
						target: ["home" , "notFound"]
					}
				},
				routes: [
					{
						pattern: "",
						name: "home",
						target: "home"
					},
					{
						pattern: "category/{id}",
						name: "category",
						target: "categoryView"
					},
					{
						pattern: "category/{id}/product/{productId}",
						name: "product",
						target: ["categoryView", "productView"]
					},
					{
						pattern: "cart",
						name: "cart",
						target: "cart"
					},
					{
						pattern: "product/{productId}",
						name: "cartProduct",
						target: ["home" , "productView"]
					}
				],
				targets: {
					productView: {
						viewName: "Product",
						viewLevel: 3,
						controlAggregation: "detailPages"
					},
					categoryView: {
						viewName: "Category",
						viewLevel: 2,
						controlAggregation: "masterPages"
					},
					notFound: {
						viewName: "NotFound",
						viewLevel: 3,
						controlAggregation: "detailPages"
					},
					welcome: {
						viewName: "Welcome",
						viewLevel: 0,
						controlAggregation: "detailPages"
					},
					home: {
						viewName: "Home",
						viewLevel: 1,
						controlAggregation: "masterPages"
					},
					cart: {
						viewName: "Cart",
						controlAggregation: "masterPages"
					}
				}
			}
		},

		init: function () {
			// call overwritten init (calls createContent)
			UIComponent.prototype.init.apply(this, arguments);

			// set i18n model
			var oI18nModel = new ResourceModel({
				bundleName: "sap.demo.bpmrulesshoppingcart.i18n.i18n"
			});
			this.setModel(oI18nModel, "i18n");

			var oModel = new ODataModel("/sap/opu/odata/IWBEP/EPM_DEVELOPER_SCENARIO_SRV/", true);
			oModel.setDefaultCountMode("None");

			this.setModel(oModel);

			//create and set cart model
			var oCartModel = new JSONModel({
				cartEntries: {},
				savedForLaterEntries: {},
				showEditAndProceedButton: false
			});
			this.setModel(oCartModel, "cartProducts");
			
			//create and set rules model
			var oRulesModel = new JSONModel({
				ruleModelEntries: {}
			});
			this.setModel(oRulesModel, "ruleInputPayload");
			
			// set device model
			var oDeviceModel = new JSONModel({
				// feature toggle for a save for later functionality in the Cart.view.xml
				isTouch: sap.ui.Device.support.touch,
				isNoTouch: !sap.ui.Device.support.touch,
				isPhone: sap.ui.Device.system.phone,
				isNoPhone: !sap.ui.Device.system.phone,
				listMode: (sap.ui.Device.system.phone) ? "None" : "SingleSelectMaster",
				listItemType: (sap.ui.Device.system.phone) ? "Active" : "Inactive"
			});
			oDeviceModel.setDefaultBindingMode("OneWay");
			this.setModel(oDeviceModel, "device");

			this._router = this.getRouter();

			//navigate to initial page for !phone
			if (!sap.ui.Device.system.phone) {
				this._router.getTargets().display("welcome");
			}

			// initialize the router
			this._router.initialize();

		},

		myNavBack : function () {
			var oHistory = sap.ui.core.routing.History.getInstance();
			var oPrevHash = oHistory.getPreviousHash();
			if (oPrevHash !== undefined) {
				window.history.go(-1);
			} else {
				this._router.navTo("home", {}, true);
			}
		},

		createContent: function () {
			// create root view
			return sap.ui.view({
				viewName: "sap.demo.bpmrulesshoppingcart.view.app",
				type: "XML"
			});
		}
	});

});