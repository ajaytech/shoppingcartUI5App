sap.ui.controller("sap.demo.bpmrulesshoppingcart.view.Order", {

	_simulateGrossPrice: function() {
		var oViewModel = this.getView().getModel().getData();
		var array = oViewModel.modeldata;

		var grossPrice = 0;
		for (var arrIndex = 0; arrIndex <= array.length - 1; arrIndex++) {
			debugger;
			var oShipmentModel = array[arrIndex];
			grossPrice += oShipmentModel.GrossPrice;
		}

		oViewModel.grossprice = grossPrice;
		grossPrice = grossPrice.toFixed(2);
		this.getView().getModel().setData({
			grossprice: grossPrice
		}, true);

		this._calculateAdditionalDiscountOnOrder(grossPrice, this.getView().getModel());
	},

	_calculateAdditionalDiscountOnOrder: function(totalAmount, oViewModel) {
		var today = new Date();

		var oOrderModel = {};
		oOrderModel.__type__ = "Order";
		oOrderModel.OrderValue = totalAmount;
		oOrderModel.OrderDate = today;

		var payloadStr = JSON.stringify(oOrderModel);

		$.ajax({
			url: "/bpmrulesruntime/rules-service/v1/rules/xsrf-token",
			method: "GET",
			headers: {
				"X-CSRF-Token": "Fetch"
			},
			success: function(result, xhr, data) {
				var token = data.getResponseHeader("X-CSRF-Token");

				$.ajax({
					url: " /bpmrulesruntime/rules-service/rest/v1/rule-services/java/ShoppingCartPromotionRules/DiscountRuleservice",
					method: "POST",
					contentType: "application/json",
					data: payloadStr,
					async: false,
					headers: {
						"X-CSRF-Token": token
					},
					success: function(result1, xhr1, data1) {
						if (result1 !== null) {
							if (result1.IsSeasonalDiscount === "Yes") {
								var addDiscount = result1.Discount;
								oViewModel.getData().seasonalDiscount = addDiscount;
								
								var seasonalOfferTxt = "";
								var month = today.getMonth();
								if(month === 0 || month === 11){
									seasonalOfferTxt = "Chritmas & New Year Sale: ";
								}else if(month === 08 || month === 10){
									seasonalOfferTxt = "Seasonal Sale: ";
								}else{
									seasonalOfferTxt = "End of Season Sale: ";
								}

								if (addDiscount > 0) {
									oViewModel.getData().seasonalOffer = seasonalOfferTxt + addDiscount + "% off on your order";
									oViewModel.setData({
										seasonalDiscount: addDiscount,
										showSeasonalOffer: true
									}, true);
								} else {
									oViewModel.getData().seasonalOffer = "No offers on your order!";
									oViewModel.setData({
										seasonalDiscount: addDiscount,
										showSeasonalOffer: false
									}, true);
								}
							}
						}
					}
				});
			}
		});
	},

	onInit: function() {
		var oModel = this.getView().getViewData();
		this.getView().setModel(oModel);

		// handle data binding validation results
		sap.ui.getCore().attachValidationError(
			function(oEvent) {
				var oElement = oEvent.getParameter("element");
				if (oElement.setValueState) {
					oElement.setValueState(sap.ui.core.ValueState.Error);
				}
			}
		);

		sap.ui.getCore().attachValidationSuccess(
			function(oEvent) {
				var oElement = oEvent.getParameter("element");
				if (oElement.setValueState) {
					oElement.setValueState(sap.ui.core.ValueState.None);
				}
			}
		);

		this._simulateGrossPrice();
	},

	_checkInput: function() {
		var oView = this.getView();
		var aInputs = [
			oView.byId("inputName"),
			oView.byId("inputAddress"),
			oView.byId("inputMail"),
			oView.byId("inputNumber")
		];

		// make sure all fields are not empty
		// (this is not done by data binding validation
		//  as data binding only runs on changing values)
		jQuery.each(aInputs, function(i, oInput) {
			if (!oInput.getValue()) {
				oInput.setValueState(sap.ui.core.ValueState.Error);
			}
		});

		// check that all fields are ok
		for (var i = 0; i < aInputs.length; i++) {			
			debugger;

			if (aInputs[i].getValueState() === sap.ui.core.ValueState.Error) {
				return false;
			}
		}
		return true;
	}
});