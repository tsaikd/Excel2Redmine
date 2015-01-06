app

.controller("indexCtrl"
	, [       "$scope", "$state", "$mdToast", "$filter", "Redmine", "Loading", "localStorageService", "Excel"
	, function($scope,   $state,   $mdToast,   $filter,   Redmine,   Loading,   localStorageService,   Excel) {

	$scope.excelFile = [];
	$scope.wbmap = [];

	$scope.curSheet = null;
	$scope.setCurSheet = function(sheet) {
		$scope.curSheet = sheet;
	};

	$scope.$watch("excelFile", function() {
		$scope.parseExcel();
	});

	$scope.parseExcel = function() {
		var file = $scope.excelFile[0];
		if (!file) {
			return;
		}
		Excel.parseFile(file).then(function(sheets) {
			$scope.wbmap = sheets;
		});
	};

	$scope.errMsg = function(data) {
		if (data.data === undefined && data.status === 404) {
			// redmine config incorrect
			if (!Loading.isLoading("ErrorConfig")) {
				Loading.add("ErrorConfig");
				$mdToast.show(
					$mdToast.simple()
						.content($filter("translate")("Connect to Redmine server failed, please check config."))
						.position("top right")
						.hideDelay(3000)
				).finally(function() {
					Loading.del("ErrorConfig");
				});
				$state.go("config");
			}
			return;
		}
		// TODO
		console.error(data);
	};

	$scope.projectData = {};
	$scope.reloadProjects = function() {
		Redmine.Project.list().then(function(data) {
			if (data.data.projects.length) {
				data.data.projects.forEach(function(project) {
					var fullname = project.name || "";
					var parent = project.parent;
					while (parent) {
						fullname = parent.name + " / " + fullname;
						parent = parent.parent;
					}
					project.fullname = fullname;
				});
			}
			$scope.projectData = data.data;
			$scope.projectData.selectIdx = localStorageService.get("projectData.selectIdx") || "0";
		}, function(data) {
			$scope.errMsg(data);
		});
	};
	$scope.$watch("projectData.selectIdx", function() {
		if ($scope.projectData.selectIdx !== undefined) {
			localStorageService.set("projectData.selectIdx", $scope.projectData.selectIdx);
		}
	});
	$scope.reloadProjects();

	function is_issue_valid(issue) {
		if (!issue) {
			return false;
		}
		var keys = ["subject", "tracker_id", "status_id", "priority_id"];
		for (var i=0 ; i<keys.length ; i++) {
			var key = keys[i];
			if (issue[key] === undefined) {
				return false;
			}
		}
		return true;
	}

	$scope.import = function($event) {
		var sheet = $scope.curSheet;
		if (!sheet) {
			return;
		}
		for (var i=1 ; i<sheet.yaxis.length ; i++) {
			var y = sheet.yaxis[i];
			var issue = {};
			sheet.headers.forEach(function(header) {
				var x = header.x;
				if (sheet.data[x][y] && sheet.data[x][y].filtered !== undefined) {
					if (header.key == "custom_fields") {
						issue["custom_fields"] = issue["custom_fields"] || [];
						issue["custom_fields"].push({
							id: header.info.id,
							value: sheet.data[x][y].filtered
						});
					} else {
						issue[header.key] = sheet.data[x][y].filtered;
					}
				}
			});
			if (is_issue_valid(issue)) {
				if (sheet.yinfo[y].created && !sheet.yinfo[y].error) {
					continue;
				}
				var idx = +$scope.projectData.selectIdx;
				issue.project_id = +$scope.projectData.projects[idx].id;
				Redmine.Issue.create({
					data: {
						issue: issue
					},
					sheetyinfo: sheet.yinfo[y]
				}).then(function(data) {
					data.opts.sheetyinfo.created = true;
				}, function(data) {
					data.opts.sheetyinfo.created = true;
					data.opts.sheetyinfo.error = true;
					if (data.data && data.data.errors && data.data.errors.length) {
						data.opts.sheetyinfo.error = data.data.errors.join("\n");
					}
				});
			}
		}
	};

}])

;
