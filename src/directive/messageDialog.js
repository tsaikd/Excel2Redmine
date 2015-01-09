app

.controller("messageDialogCtrl"
	, [       "$scope", "$mdDialog", "param"
	, function($scope,   $mdDialog,   param) {

	$scope.param = param;

	$scope.ok = function($event) {
		$mdDialog.hide();
	};

	$scope.cancel = function($event) {
		$mdDialog.cancel();
	};

}])

;
