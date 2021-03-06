app

.controller("indexCtrl"
	, [       "$scope", "$state", "$mdToast", "$mdDialog", "$filter", "$q", "$window"
	, "Redmine", "Loading", "localStorageService", "Config", "Excel"
	, function($scope,   $state,   $mdToast,   $mdDialog,   $filter,   $q,   $window
	,  Redmine,   Loading,   localStorageService,   Config,   Excel) {

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
		if ( (data.data === undefined && data.status === 404)
			|| (data.data === null && data.status === 0) ) {
			// redmine config incorrect
			showErrorMessage("Connect to Redmine server failed, please check config.");
			$state.go("config");
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

		var title = $filter("translate")("Unknown ERROR, please post the following message to Github Issue");
		var content = JSON.stringify(data, undefined, 2);
		$mdDialog.show({
			controller: "messageDialogCtrl",
			templateUrl: "src/directive/messageDialog.html",
			locals: {
				param: {
					title: title,
					messages: content.split("\n")
				}
			}
		}).then(function() {
			$window.open("https://github.com/tsaikd/Excel2Redmine/issues");
		});
		console.error("unknown error: ", data);
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

	function genExcelRowIssue(sheet, y, fieldMap) {
		var issue = {
			custom_fields: []
		};

		var idx = +$scope.projectData.selectIdx;
		issue.project_id = +$scope.projectData.projects[idx].id;

		angular.forEach(Config.defFieldVal, function(fieldVal) {
			issue[fieldVal.field] = fieldVal.value;
		});

		var defCustomField = {};
		angular.forEach(Config.defCustomFieldVal, function(fieldVal) {
			defCustomField[fieldVal.field] = fieldVal.value;
		});

		sheet.headers.forEach(function(header) {
			var x = header.x;
			if (sheet.data[x][y] && sheet.data[x][y].filtered !== undefined) {
				if (header.key == "custom_fields") {
					issue["custom_fields"].push({
						id: header.info.id,
						value: sheet.data[x][y].filtered
					});
					delete defCustomField[header.info.name];
				} else {
					issue[header.key] = sheet.data[x][y].filtered;
				}
			}
		});

		angular.forEach(defCustomField, function(value, field) {
			var fieldInfo = fieldMap[field];
			if (fieldInfo) {
				issue["custom_fields"].push({
					id: fieldInfo.id,
					value: value
				});
			}
		});

		if (issue["custom_fields"].length < 1) {
			delete issue["custom_fields"];
		}

		return issue;
	}

	$scope.fieldMapData = {};
	$scope.reloadFieldMap = function() {
		var idx = +$scope.projectData.selectIdx;
		if (isNaN(idx)) {
			return;
		}
		var project_id = +$scope.projectData.projects[idx].id;
		if (!isNaN(project_id)) {
			(function(project) {
				Excel.genFieldMap(project_id).then(function(fieldMap) {
					$scope.fieldMapData.fieldMap = fieldMap;
				}, function(data) {
					$scope.errMsg({
						message: "{{project.name}}: Get project info failed",
						params: {
							project: project
						}
					});
				});
			})($scope.projectData.projects[idx]);
		}
	};
	$scope.$watch("projectData.selectIdx", function() {
		$scope.reloadFieldMap();
	});

	$scope.checkImportedRow = function($event) {
		var startTime = new Date().getTime();
		$event && ga("send", "event", "button", "click", "checkImportedRow");
		var sheet = $scope.wbmap[$scope.selectedSheet];
		if (!sheet || !sheet.headerMap["subject"]) {
			$scope.errMsg({ message: "Check nothing" });
			return;
		}
		var promises = [];
		var idx = +$scope.projectData.selectIdx;
		var project_id = +$scope.projectData.projects[idx].id;
		var checkIssueFields = Config.getCheckIssueFields();
		var checkIssueCustomFields = Config.getCheckIssueCustomFields();
		for (var i=1 ; i<sheet.yaxis.length ; i++) {
			var y = sheet.yaxis[i];
			if (sheet.yinfo[y].errorcount) {
				continue;
			}

			var issue = genExcelRowIssue(sheet, y, $scope.fieldMapData.fieldMap);

			var subject_x = sheet.headerMap["subject"].x;
			var subject = sheet.data[subject_x][y].filtered;
			var params = {
				project_id: project_id,
			};
			checkIssueFields.forEach(function(field) {
				if (!sheet.headerMap[field]) {
					return;
				}
				var field_x = sheet.headerMap[field].x;
				params[field] = sheet.data[field_x][y].filtered;
			});
			checkIssueCustomFields.forEach(function(field) {
				if (!sheet.headerMap["custom_fields"][field]) {
					return;
				}
				var field_x = sheet.headerMap["custom_fields"][field].x;
				var cf_id = sheet.headerMap["custom_fields"][field].info.id;
				var cf_key = "cf_" + cf_id;
				params[cf_key] = sheet.data[field_x][y].filtered;
			});
			var promise =  Redmine.Issue.exist({
				params: params,
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
			ga("send", "timing", "import", "checkImportedRow", new Date().getTime() - startTime, "Success");
		}, function(data) {
			ga("send", "timing", "import", "checkImportedRow", new Date().getTime() - startTime, "Failure");
			console.error("unexpected error:", data);
		});
	};

	$scope.import = function($event) {
		var startTime = new Date().getTime();
		$event && ga("send", "event", "button", "click", "import");
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
			if (sheet.yinfo[y].created && !sheet.yinfo[y].error) {
				continue;
			}

			var issue = genExcelRowIssue(sheet, y, $scope.fieldMapData.fieldMap);

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
			ga("send", "timing", "import", "import excel", new Date().getTime() - startTime, "Success");
		}, function(data) {
			ga("send", "timing", "import", "import excel", new Date().getTime() - startTime, "Failure");
			console.error("unexpected error:", data);
		});
	};

}])

;
