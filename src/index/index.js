app

.controller("IndexCtrl"
	, [       "$scope", "$state", "$mdBottomSheet", "$translate", "Version"
	, function($scope,   $state,   $mdBottomSheet,   $translate,   Version) {

	$scope.Version = Version;

	$scope.showLangBottomSheet = function($event) {
		$event && ga("send", "event", "button", "click", "showLangBottomSheet");
		$mdBottomSheet.show({
			templateUrl: "src/directive/langSelect.html",
			controller: "langSelectCtrl",
			targetEvent: $event
		}).then(function(clickedItem) {
			ga("send", "event", "language", "select", clickedItem.lang);
			$translate.use(clickedItem.lang);
		});
	};

	$scope.go = function($event, state) {
		$event && ga("send", "event", "button", "click", "go " + state);
	};

}])

;
