app

.controller("IndexCtrl"
	, [       "$scope", "$mdBottomSheet", "$translate", "Version"
	, function($scope,   $mdBottomSheet,   $translate,   Version) {

	$scope.Version = Version;

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
