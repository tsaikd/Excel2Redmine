app

.factory("Excel"
	, [       "$q", "$filter", "Redmine", "Config"
	, function($q,   $filter,   Redmine,   Config) {

	function Excel() {}

	var redmineParams = {
		limit: 5000
	};
	var cache = {};

	function loadRedmine() {
		var deferred = $q.defer();

		var cachekey = "loadRedmine";
		if (cache[cachekey]) {
			deferred.resolve(cache[cachekey]);
			return deferred.promise;
		}

		$q.all([
			Redmine.trackers({ params: redmineParams }),
			Redmine.Issue.status({ params: redmineParams }),
			Redmine.priorities({ params: redmineParams }),
			Redmine.customFields({ params: redmineParams })
		]).then(function(data) {
			cache[cachekey] = {
				trackers: data[0].data.trackers,
				issue_statuses: data[1].data.issue_statuses,
				issue_priorities: data[2].data.issue_priorities,
				custom_fields: data[3].data.custom_fields
			};
			deferred.resolve(cache[cachekey]);
		}, function(data) {
			deferred.reject(data);
		});

		return deferred.promise;
	};
	// preload and cache redmine request
	loadRedmine();

	function loadProjectInfo(projectId) {
		var deferred = $q.defer();

		if (!projectId) {
			deferred.reject({
				message: "invalid project id"
			});
			return deferred.promise;
		}

		var cachekey = "loadProjectInfo/" + projectId;
		if (cache[cachekey]) {
			deferred.resolve(cache[cachekey]);
			return deferred.promise;
		}

		$q.all([
			Redmine.Project.categories({ id:projectId, params: redmineParams }),
			Redmine.Project.memberships({ id:projectId, params: redmineParams }),
			Redmine.Project.versions({ id:projectId, params: redmineParams })
		]).then(function(data) {
			cache[cachekey] = {
				issue_categories: data[0].data.issue_categories,
				memberships: data[1].data.memberships,
				versions: data[2].data.versions
			};
			deferred.resolve(cache[cachekey]);
		}, function(data) {
			deferred.reject(data);
		});

		return deferred.promise;
	}

	function genFieldInfos(projectId) {
		var deferred = $q.defer();

		$q.all([
			loadRedmine(),
			loadProjectInfo(projectId)
		]).then(function(data) {
			data = angular.extend({}, data[0], data[1]);
			var fieldInfos = [
				{
					key: "subject",
					names: ["Subject", "主旨"],
					field_format: "string",
					nullable: false
				},
				{
					key: "description",
					names: ["Description", "概述"],
					field_format: "string",
					nullable: true
				},
				{
					key: "tracker_id",
					names: ["Tracker", "追蹤標籤"],
					field_format: "enum",
					nullable: false,
					possible_values: data["trackers"]
				},
				{
					key: "status_id",
					names: ["Status", "狀態"],
					field_format: "enum",
					nullable: false,
					possible_values: data["issue_statuses"]
				},
				{
					key: "priority_id",
					names: ["Priority", "優先權"],
					field_format: "enum",
					nullable: false,
					possible_values: data["issue_priorities"]
				},
				{
					key: "start_date",
					names: ["Start Date", "開始日期"],
					field_format: "date",
					nullable: true
				},
				{
					key: "due_date",
					names: ["Due Date", "完成日期"],
					field_format: "date",
					nullable: true
				},
				{
					key: "category_id",
					names: ["Category", "分類"],
					field_format: "enum",
					nullable: true,
					possible_values: data["issue_categories"]
				},
				{
					key: "fixed_version_id",
					names: ["Target version", "版本"],
					field_format: "enum",
					nullable: true,
					possible_values: data["versions"]
				},
				{
					key: "assigned_to_id",
					names: ["Assignee", "分派給"],
					field_format: "enum",
					nullable: true,
					possible_values: data["memberships"].map(function(membership) {
						return membership.user;
					})
				},
				{
					key: "parent_issue_id",
					names: ["Parent task", "父問題"],
					field_format: "int",
					nullable: true
				},
				{
					key: "watcher_user_ids",
					names: ["Watchers", "監看者"],
					field_format: "enum",
					nullable: true,
					possible_values: data["memberships"].map(function(membership) {
						return membership.user;
					})
				},
				{
					key: "is_private",
					names: ["Private", "私人"],
					field_format: "bool",
					nullable: true
				},
				{
					key: "estimated_hours",
					names: ["Estimated time", "預估工時"],
					field_format: "int",
					nullable: true
				}
			];
			data["custom_fields"].forEach(function(field) {
				fieldInfos.push(angular.extend({}, field, {
					key: "custom_fields",
					names: [field.name],
					nullable: true
				}));
			});
			deferred.resolve(fieldInfos);
		}, function(data) {
			deferred.reject(data);
		});

		return deferred.promise;
	}

	function genFieldMap(projectId) {
		var deferred = $q.defer();
		var fieldMap = {};

		var field_filter_map = {
			"string": function(field, value) {
				value = value.trim();
				return value ? value : undefined;
			},
			"bool": function(field, value) {
				value = value.trim();
				switch (value) {
				case "1":
				case "true":
				case "checked":
					return true;
				case "0":
				case "false":
				case "":
					return false;
				}
				return undefined;
			},
			"int": function(field, value) {
				value = +value;
				return isNaN(value) ? undefined : value;
			},
			"list": function(field, value) {
				if (Config.checkRedmineCustomFieldListInClient) {
					for (var i=0 ; i<field.possible_values.length ; i++) {
						if (value === field.possible_values[i].value) {
							return value;
						}
					}
					return undefined;
				} else {
					return value;
				}
			},
			"enum": function(field, value) {
				var enumArray = field.possible_values;
				if (!value || !enumArray || !enumArray.length) {
					return undefined;
				}
				for (var i=0 ; i<enumArray.length ; i++) {
					var enumInfo = enumArray[i];
					if (value == enumInfo.name) {
						return +enumInfo.id;
					}
				}
				return undefined;
			},
			"date": function(field, value) {
				var ma;
				var strdate;
				var date;
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

		genFieldInfos(projectId).then(function(fieldInfos){
			fieldInfos.forEach(function(fieldInfo) {
				fieldInfo.filter = field_filter_map[fieldInfo["field_format"]];
				if (!fieldInfo.filter) {
					console.error("unknown field format: " + fieldInfo["field_format"], fieldInfo);
				}
				fieldInfo.names.forEach(function(name) {
					fieldMap[name] = fieldInfo;
				});
			});
			deferred.resolve(fieldMap);
		}, function(data) {
			deferred.reject(data);
		});

		return deferred.promise;
	}

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

	function handleWorkbookSheet(wbSheet, sheetName, fieldMap) {
		var formulae = XLSX.utils.get_formulae(wbSheet);
		if (!formulae) {
			return;
		}

		var sheet = {
			name: sheetName,
			data: {},
			headers: [],
			xinfo: {},
			yinfo: {},
			xaxis: [],
			yaxis: []
		};

		var ref = wbSheet["!ref"].split(":")[1];
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
			sheet.yinfo[i] = { errorcount: 0 };
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
			var headerInfo = fieldMap[sheet.data[x][1].value];
			if (!headerInfo) {
				return;
			}
			sheet.headers.push({
				key: headerInfo.key,
				x: x,
				info: headerInfo
			});
			sheet.xinfo[x].exist = true;

			sheet.yaxis.forEach(function(y) {
				var data = sheet.data[x][y] = sheet.data[x][y] || { value: "" };
				data.filtered = headerInfo.filter(headerInfo, data.value);
				if (data.filtered === undefined) {
					if (data.value == "") {
						if (headerInfo.nullable) {
							data.valid = true;
						} else {
							data.valid = false;
						}
					} else {
						data.valid = false;
					}
				} else {
					data.valid = true;
				}
				if (!data.valid) {
					sheet.yinfo[y].errorcount++;
				}
			});
		});

		return sheet;
	}

	function handleWorkbook(workbook, projectId) {
		var deferred = $q.defer();

		genFieldMap(projectId).then(function(fieldMap) {
			var sheets = [];
			workbook.SheetNames.forEach(function(sheetName) {
				var sheet = handleWorkbookSheet(workbook.Sheets[sheetName], sheetName, fieldMap);
				if (sheet) {
					sheets.push(sheet);
				}
			});
			deferred.resolve(sheets);
		}, function(data) {
			deferred.reject(data);
		});

		return deferred.promise;
	}

	Excel.prototype.parseFile = function(file, projectId) {
		var deferred = $q.defer();

		var reader = new FileReader();
		reader.onload = function(e) {
			var data = e.target.result;
			var wb;
			try {
				wb = XLSX.read(data, {type: "binary"});
				handleWorkbook(wb, projectId).then(function(data) {
					deferred.resolve(data);
				}, function(data) {
					deferred.reject(data);
				});
			} catch(e) {
				deferred.reject(e);
			}
		};
		reader.readAsBinaryString(file);

		return deferred.promise;
	};

	return new Excel();
}])

;
