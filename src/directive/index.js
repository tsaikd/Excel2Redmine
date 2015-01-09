app

.controller("indexCtrl"
	, [       "$scope", "$state", "$mdToast", "$filter", "$q", "Redmine", "Loading", "localStorageService", "Excel"
	, function($scope,   $state,   $mdToast,   $filter,   $q,   Redmine,   Loading,   localStorageService,   Excel) {

	$scope.excelFile = [];
	$scope.wbmap = [];

	$scope.$watch("excelFile", function() {
		$scope.parseExcel();
	});

	// unknown why selectedSheet will out of range
	// reproduce step: select excel file between 1 sheet and 2 sheets file
	$scope.$watch("selectedSheet", function() {
		if ($scope.selectedSheet && $scope.selectedSheet >= $scope.wbmap.length) {
			$scope.selectedSheet = 0;
		}
	});

	$scope.parseExcel = function() {
		var file = $scope.excelFile[0];
		if (!file) {
			return;
		}
		Excel.parseFile(file, $scope.projectData.projects[$scope.projectData.selectIdx].id)
			.then(function(sheets) {
				$scope.wbmap = sheets;
				$scope.selectedSheet = 0;
			}, function(e) {
				$scope.errMsg(e);
			});
	};

	/*
	 * return true if show error message, false if message showing
	 */
	function showErrorMessage(message, params) {
		if (!Loading.isLoading(message)) {
			Loading.add(message);
			$mdToast.show(
				$mdToast.simple()
					.content($filter("translate")(message, params))
					.position("top right")
					.hideDelay(3000)
			).finally(function() {
				Loading.del(message);
			});
			return true;
		}
		return false;
	}

	$scope.errMsg = function(data) {
		if (data.data === undefined && data.status === 404) {
			// redmine config incorrect
			if (showErrorMessage("Connect to Redmine server failed, please check config.")) {
				$state.go("config");
			}
			return;
		}
		if (data.message) {
			switch (data.message) {
			case "Corrupted zip : can't find end of central directory":
				showErrorMessage("Unable to parse excel file, please check the file format is corrent.");
				break;
			default:
				showErrorMessage(data.message, data.params);
				break;
			}
			return;
		}
		console.error("unknown error: " + data);
	};

	$scope.projectData = {};
	$scope.reloadProjects = function() {
		Redmine.Project.list({ params: { limit: 5000 } }).then(function(data) {
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
		// parse excel because project change will cause custom field change
		$scope.parseExcel();
	});
	$scope.reloadProjects();

	$scope.checkImportedRow = function($event) {
		var sheet = $scope.wbmap[$scope.selectedSheet];
		if (!sheet || !sheet.headerMap["subject"]) {
			$scope.errMsg({ message: "Check nothing" });
			return;
		}
		var promises = [];
		for (var i=1 ; i<sheet.yaxis.length ; i++) {
			var y = sheet.yaxis[i];
			if (sheet.yinfo[y].errorcount) {
				continue;
			}
			var subject_x = sheet.headerMap["subject"].x;
			var subject = sheet.data[subject_x][y].filtered;
			var promise = Redmine.Issue.exist({
				params: {
					subject: subject
				},
				sheetyinfo: sheet.yinfo[y]
			}).then(function(data) {
				data.opts.sheetyinfo.created = !!(data.data.total_count > 0);
				delete data.opts.sheetyinfo.error;
				return data;
			}, function(data) {
				data.opts.sheetyinfo.error = "Error";
				if (data.data && data.data.errors && data.data.errors.length) {
					data.opts.sheetyinfo.error = data.data.errors.join("\n");
				}
				return data;
			});
			promises.push(promise);
		}
		$q.all(promises).then(function(data) {
			var total = data.length;
			var errorcount = data.filter(function(data) {
				return data.status < 200 || data.status >= 400;
			}).length;
			var existcount = data.filter(function(data) {
				return data.opts.sheetyinfo.created;
			}).length;
			$scope.errMsg({
				message: "Check {{okcount}} issues successfully, {{errorcount}} failed, {{existcount}} issues existed.",
				params: {
					okcount: total - errorcount,
					errorcount: errorcount,
					existcount: existcount
				}
			});
		}, function(data) {
			console.error("unexpected error:", data);
		});
	};

	$scope.import = function($event) {
		var sheet = $scope.wbmap[$scope.selectedSheet];
		if (!sheet) {
			$scope.errMsg({ message: "Import nothing" });
			return;
		}
		var promises = [];
		for (var i=1 ; i<sheet.yaxis.length ; i++) {
			var y = sheet.yaxis[i];
			if (sheet.yinfo[y].errorcount) {
				continue;
			}
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
			if (sheet.yinfo[y].created && !sheet.yinfo[y].error) {
				continue;
			}
			var idx = +$scope.projectData.selectIdx;
			issue.project_id = +$scope.projectData.projects[idx].id;
			var promise = Redmine.Issue.create({
				data: {
					issue: issue
				},
				sheetyinfo: sheet.yinfo[y]
			}).then(function(data) {
				data.opts.sheetyinfo.created = true;
				delete data.opts.sheetyinfo.error;
				return data;
			}, function(data) {
				data.opts.sheetyinfo.created = true;
				data.opts.sheetyinfo.error = "Error";
				if (data.data && data.data.errors && data.data.errors.length) {
					data.opts.sheetyinfo.error = data.data.errors.join("\n");
				}
				return data;
			});
			promises.push(promise);
		}
		$q.all(promises).then(function(data) {
			var total = data.length;
			var errorcount = data.filter(function(data) {
				return data.status < 200 || data.status >= 400;
			}).length;
			$scope.errMsg({
				message: "Import {{okcount}} issues successfully, {{errorcount}} failed.",
				params: {
					okcount: total - errorcount,
					errorcount: errorcount
				}
			});
		}, function(data) {
			console.error("unexpected error:", data);
		});
	};

}])

;
