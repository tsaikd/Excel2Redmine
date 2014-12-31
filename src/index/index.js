app

.controller("IndexCtrl"
	, [       "$scope", "$mdBottomSheet", "$translate"
	, function($scope,   $mdBottomSheet,   $translate) {

	$scope.showLangBottomSheet = function($event) {
		$mdBottomSheet.show({
			templateUrl: "src/directive/langSelect.html",
			controller: "langSelectCtrl",
			targetEvent: $event
		}).then(function(clickedItem) {
			$translate.use(clickedItem.lang);
		});
	};

}])

;
