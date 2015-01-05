app

.controller("indexCtrl"
	, [       "$scope", "$state", "$mdToast", "$filter", "Redmine", "Loading", "localStorageService"
	, function($scope,   $state,   $mdToast,   $filter,   Redmine,   Loading,   localStorageService) {

	$scope.excelFile = [];
	$scope.wbmap = [];

	$scope.curSheet = null;
	$scope.setCurSheet = function(sheet) {
		$scope.curSheet = sheet;
	};

	$scope.$watch("excelFile", function() {
		$scope.parseExcel();
	});

	function x_axis_to_num(x) {
		x = x.toUpperCase();
		var num = 0;
		for (var i=0 ; i<x.length ; i++) {
			var code = x[i].charCodeAt() - "A".charCodeAt() + 1;
			num = num * 26 + code;
		}
		return num;
	}

	function num_to_x_axis(num) {
		var x = "";
		var xnum;
		var code;
		while (num > 0) {
			xnum = (num-1) % 26;
			num = parseInt((num-1) / 26);
			code = "A".charCodeAt() + xnum;
			x = String.fromCharCode(code) + x;
		}
		return x;
	}

	function next_x_axis(x) {
		var num = x_axis_to_num(x);
		return num_to_x_axis(num + 1);
	}

	function gen_enum_getter(enumArray) {
		return function(value) {
			if (!value || !enumArray || !enumArray.length) {
				return -1;
			}
			for (var i=0 ; i<enumArray.length ; i++) {
				var enumInfo = enumArray[i];
				if (value == enumInfo.name) {
					return +enumInfo.id;
				}
			}
			return -1;
		};
	}

	// dynamic generate for i18N
	function gen_valid_wb_header_map() {
		var valid_wb_header_map = {};
		["subject"].forEach(function(key) {
			valid_wb_header_map[$filter("translate")(key)] = valid_wb_header_map[key] = {
				key: key,
				nullable: false,
				filter: function(value) {
					value = "" + value;
					value = value.trim();
					return value ? value : undefined;
				}
			};
		});
		["description"].forEach(function(key) {
			valid_wb_header_map[$filter("translate")(key)] = valid_wb_header_map[key] = {
				key: key,
				nullable: true,
				filter: function(value) {
					value = "" + value;
					value = value.trim();
					return value;
				}
			};
		});
		var enumInfos = [
			{
				key: "tracker_id",
				nullable: false,
				data: $scope.trackerData["trackers"]
			},
			{
				key: "status_id",
				nullable: false,
				data: $scope.issueStatusData["issue_statuses"]
			},
			{
				key: "priority_id",
				nullable: false,
				data: $scope.priorityData["issue_priorities"]
			}
		];
		enumInfos.forEach(function(enumInfo) {
			var getter = gen_enum_getter(enumInfo.data);
			valid_wb_header_map[$filter("translate")(enumInfo.key)] = valid_wb_header_map[enumInfo.key] = {
				key: enumInfo.key,
				filter: function(value) {
					var id = getter(value);
					return id >= 0 ? id : undefined;
				}
			};
		});
		["start_date", "due_date"].forEach(function(key) {
			valid_wb_header_map[$filter("translate")(key)] = valid_wb_header_map[key] = {
				key: key,
				nullable: true,
				filter: function(value) {
					var ma;
					var strdate;
					var date;
					value = "" + value;
					value = value.trim();
					if (ma = value.match(/(\d{4})[-/](\d{1,2})[-/](\d{1,2})/)) {
						strdate = ma[1] + "-" + ma[2] + "-" + ma[3];
					} else if (ma = value.match(/(\d{1,2})\/(\d{1,2})\/(\d{2})/)) {
						strdate = "20" + ma[3] + "-" + ma[1] + "-" + ma[2];
					}
					if (strdate) {
						date = new Date(strdate);
						if (date) {
							return $filter("date")(date, "yyyy-MM-dd");
						}
					}
					return undefined;
				}
			};
		});
		if ($scope.customFieldsData && $scope.customFieldsData["custom_fields"]) {
			$scope.customFieldsData["custom_fields"].forEach(function(field) {
				valid_wb_header_map[field.name] = {
					key: "custom_fields",
					nullable: true,
					field: field,
					filter: function(value) {
						return value;
					}
				};
			});
		}
		return valid_wb_header_map;
	}

	function to_wbmap(workbook) {
		var result = [];
		var valid_wb_header_map = gen_valid_wb_header_map();
		workbook.SheetNames.forEach(function(sheetName) {
			var formulae = XLSX.utils.get_formulae(workbook.Sheets[sheetName]);
			if (!formulae) {
				return;
			}

			var sheet = {
				name: sheetName,
				data: {},
				headers: [],
				xinfo: {},
				yinfo: {},
				stat: {
					errorcount: 0
				},
				xaxis: [],
				yaxis: []
			};

			var ref = workbook.Sheets[sheetName]["!ref"].split(":")[1];
			if (!ref) {
				return;
			}
			var refx = ref.match(/[a-z]+/i); refx = refx && refx[0];
			var refy = ref.match(/[0-9]+/); refy = refy && +refy[0];
			for (var x="A" ; ; x=next_x_axis(x)) {
				sheet.xaxis.push(x);
				sheet.data[x] = {};
				sheet.xinfo[x] = {};
				if (x == refx) {
					break;
				}
			}
			for (var i=1 ; i<=refy ; i++) {
				sheet.yaxis.push(i);
				sheet.yinfo[i] = {};
			}

			formulae.forEach(function(cellraw) {
				var cellsplit = cellraw.split("='");
				var xy = cellsplit.shift();
				var x = xy.match(/[a-z]+/i); x = x && x[0];
				var y = xy.match(/[0-9]+/); y = y && +y[0];
				var text = cellsplit.join("='");
				sheet.data[x][y] = {
					value: text
				};
			});

			// parse valid header row
			sheet.xaxis.forEach(function(x) {
				if (!sheet.data[x][1]) {
					return;
				}
				var headerInfo = valid_wb_header_map[sheet.data[x][1].value];
				if (headerInfo) {
					sheet.headers.push({
						key: headerInfo.key,
						x: x,
						info: headerInfo
					});
					sheet.xinfo[x].exist = true;

					sheet.yaxis.forEach(function(y) {
						var data = sheet.data[x][y] = sheet.data[x][y] || {};
						data.filtered = headerInfo.filter(data.value);
						if (data.filtered) {
							data.valid = true;
						} else if (headerInfo.nullable) {
							data.valid = true;
						} else {
							data.valid = false;
						}
						if (data.valid) {
							sheet.stat.errorcount++;
						}
					});
				}
			});

			result.push(sheet);
		});
		return result;
	}

	$scope.parseExcel = function() {
		var file = $scope.excelFile[0];
		if (!file) {
			return;
		}
		var reader = new FileReader();
		reader.onload = function(e) {
			var data = e.target.result;
			var wb = XLSX.read(data, {type: "binary"});
			$scope.wbmap = to_wbmap(wb);
			$scope.$digest();
		};
		reader.readAsBinaryString(file);
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

	$scope.trackerData = {};
	$scope.reloadTrackers = function() {
		Redmine.trackers().then(function(data) {
			$scope.trackerData = data.data;
			$scope.trackerData.selectIdx = "0";
		}, function(data) {
			$scope.errMsg(data);
		});
	};
	$scope.reloadTrackers();

	$scope.issueStatusData = {};
	$scope.reloadIssueStatus = function() {
		Redmine.Issue.status().then(function(data) {
			$scope.issueStatusData = data.data;
			$scope.issueStatusData.selectIdx = "0";
		}, function(data) {
			$scope.errMsg(data);
		});
	};
	$scope.reloadIssueStatus();

	$scope.priorityData = {};
	$scope.reloadPriority = function() {
		Redmine.priorities().then(function(data) {
			$scope.priorityData = data.data;
			$scope.priorityData.selectIdx = "0";
		}, function(data) {
			$scope.errMsg(data);
		});
	};
	$scope.reloadPriority();

	$scope.customFieldsData = {};
	$scope.reloadCustomFields = function() {
		Redmine.customFields().then(function(data) {
			$scope.customFieldsData = data.data;
		}, function(data) {
			$scope.errMsg(data);
		});
	};
	$scope.reloadCustomFields();

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
							id: header.info.field.id,
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
