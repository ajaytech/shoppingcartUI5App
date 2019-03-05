sap.ui.define([
	'sap/ui/core/mvc/Controller',
	'sap/ui/model/json/JSONModel',
	'sap/ui/model/Filter',
	'sap/demo/bpmrulesshoppingcart/model/formatter'

], function (Controller, JSONModel, Filter, formatter) {
	"use strict";

	return Controller.extend("sap.demo.bpmrulesshoppingcart.view.Welcome", {

		ICON_NUMBER: 9,

		INITIAL_DELAY: 4000,

		DELAY: 3000,

		_iCarouselTimeout: 0, // a pointer to the current timeout
		_iCarouselLoopTime: 8000, // loop to next picture after 8 seconds
		formatter: formatter,

		_mFilters: {
			Promoted: [new Filter("Type", "EQ", "Promoted")],
			Viewed: [new Filter("Type", "EQ", "Viewed")],
			Favorite: [new Filter("Type", "EQ", "Favorite")]
		},

		/**
		 * Convenience method for accessing the router.
		 * @public
		 * @returns {sap.ui.core.routing.Router} the router for this component
		 */
		getRouter: function () {
			return sap.ui.core.UIComponent.getRouterFor(this);
		},

		/**
		 * Convenience method for getting the view model by name.
		 * @public
		 * @param {string} [sName] the model name
		 * @returns {sap.ui.model.Model} the model instance
		 */
		getModel: function (sName) {
			return this.getView().getModel(sName);
		},

		/**
		 * Convenience method for setting the view model.
		 * @public
		 * @param {sap.ui.model.Model} oModel the model instance
		 * @param {string} sName the model name
		 * @returns {sap.ui.mvc.View} the view instance
		 */
		setModel: function (oModel, sName) {
			return this.getView().setModel(oModel, sName);
		},

		/**
		 * Getter for the resource bundle.
		 * @public
		 * @returns {sap.ui.model.resource.ResourceModel} the resourceModel of the component
		 */
		getResourceBundle: function () {
			return this.getOwnerComponent().getModel("i18n").getResourceBundle();
		},

		onInit: function () {
			//this._animate(1, true);

			var oViewModel = new JSONModel({
				welcomeCarouselShipping: 'img/ShopCarouselShipping.jpg',
				welcomeCarouselInviteFriend: 'img/ShopCarouselInviteFriend.jpg',
				welcomeCarouselTablet: 'img/ShopCarouselTablet.jpg',
				welcomeCarouselCreditCard: 'img/ShopCarouselCreditCard.jpg',
				Promoted: [],
				Currency: "EUR"
			});
			this.getView().setModel(oViewModel, "view");
			this.getRouter().attachRouteMatched(this._onRouteMatched, this);
			this.getRouter().getTarget("welcome").attachDisplay(this._onRouteMatched, this);

			// select random carousel page at start
			var oWelcomeCarousel = this.byId("welcomeCarousel");
			var iRandomIndex = Math.floor(Math.abs(Math.random()) * oWelcomeCarousel.getPages().length);
			oWelcomeCarousel.setActivePage(oWelcomeCarousel.getPages()[iRandomIndex]);
		},

		/**
		 * lifecycle hook that will initialize the welcome carousel
		 */
		onAfterRendering: function () {
			this.onCarouselPageChanged();
		},

		_animate: function (iLevel, bForward) {

			if (iLevel === this.ICON_NUMBER + 1) {

				// end of recursion: fade them all
				for (var i = 0; i < this.ICON_NUMBER; i++) {
					var oIcon = this.getView().byId("icon" + (i + 1));
					oIcon.addStyleClass("welcomeIconFade");
				}

			} else {

				// wait, animate and step down into recursion
				var iDelay = (iLevel === 1) ? this.INITIAL_DELAY : this.DELAY;
				this._iDelay = setTimeout(jQuery.proxy(function () {
					var oIcon = this.getView().byId("icon" + iLevel);
					if (bForward) {
						oIcon.addStyleClass("welcomeIconRotateForward");
					} else {
						oIcon.addStyleClass("welcomeIconRotateBackward");
					}
					this._animate(iLevel + 1, !bForward);
				}, this), iDelay);
			}
		},

		/**
		 * Event handler to determine which button was clicked
		 * @param {sap.ui.base.Event} oEvent the button press event
		 */
		onAddButtonPress: function (oEvent) {
			var oResourceBundle = this.getModel("i18n").getResourceBundle();
			var oProduct = oEvent.getSource().getBindingContext("view").getObject();
			var oCartModel = this.getModel("cartProducts");
			
			//cart.addToCart(oResourceBundle, oProduct, oCartModel);
		},

		_onRouteMatched: function (oEvent) {
			// we do not need to call this function if the url hash refers to product or cart product
			if (oEvent.getParameter("name") !== "product" && oEvent.getParameter("name") !== "cartProduct") {
				var aPromotedData = this.getView().getModel("view").getProperty("/Promoted");
				if (!aPromotedData.length) {
					var oModel = this.getModel();
					Object.keys(this._mFilters).forEach(function (sFilterKey) {
						oModel.read("/FeaturedProducts", {
							urlParameters: {
								"$expand": "Product"
							},
							filters: this._mFilters[sFilterKey],
							success: function (oData) {
								this.getModel("view").setProperty("/" + sFilterKey, oData.results);
								if (sFilterKey === "Promoted") {
									this._selectPromotedItems();
								}
							}.bind(this)
						});
					}.bind(this));
				}
			}
		},

		/**
		 * clear previous animation and initialize the loop animation of the welcome carousel
		 */
		onCarouselPageChanged: function () {
			clearTimeout(this._iCarouselTimeout);
			this._iCarouselTimeout = setTimeout(function () {
				var oWelcomeCarousel = this.byId("welcomeCarousel");
				if (oWelcomeCarousel) {
					oWelcomeCarousel.next();
					this.onCarouselPageChanged();
				}
			}.bind(this), this._iCarouselLoopTime);
		},

		/**
		 * Event handler to determine which link the user has clicked
		 * @param {sap.ui.base.Event} oEvent the press event of the link
		 */
		onSelectProduct: function (oEvent) {
			var oContext = oEvent.getSource().getBindingContext("view");
			var sCategoryId = oContext.getProperty("Product/Category");
			var sProductId = oContext.getProperty("Product/ProductId");
			this.getRouter().navTo("product", {
				id: sCategoryId,
				productId: sProductId
			});
		},

		/**
		 * Select two random elements from the promoted products array
		 * @private
		 */
		_selectPromotedItems: function () {
			var aPromotedItems = this.getView().getModel("view").getProperty("/Promoted");
			var iRandom1, iRandom2 = Math.floor(Math.random() * aPromotedItems.length);
			do {
				iRandom1 = Math.floor(Math.random() * aPromotedItems.length);
			} while (iRandom1 === iRandom2);
			this.getModel("view").setProperty("/Promoted", [aPromotedItems[iRandom1], aPromotedItems[iRandom2]]);
		},

		onExit: function () {
			clearTimeout(this._iDelay);
		}
	});
});