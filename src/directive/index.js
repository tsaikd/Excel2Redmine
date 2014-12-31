app

.controller("indexCtrl"
	, [       "$scope", "Redmine"
	, function($scope,   Redmine) {

	$scope.excelFile = [];
	$scope.wbmap = [];

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

	function to_wbmap(workbook) {
		var result = [];
		workbook.SheetNames.forEach(function(sheetName) {
			var formulae = XLSX.utils.get_formulae(workbook.Sheets[sheetName]);
			if (!formulae) {
				return;
			}

			var sheet = {
				name: sheetName,
				data: {},
				xaxis: [],
				yaxis: []
			};

			var ref = workbook.Sheets[sheetName]["!ref"].split(":")[1];
			var refx = ref.match(/[a-z]+/i); refx = refx && refx[0];
			var refy = ref.match(/[0-9]+/); refy = refy && +refy[0];
			for (var i="A" ; ; i=next_x_axis(i)) {
				sheet.xaxis.push(i);
				if (i == refx) {
					break;
				}
			}
			for (var i=1 ; i<=refy ; i++) {
				sheet.yaxis.push(i);
			}

			formulae.forEach(function(cellraw) {
				var cellsplit = cellraw.split("='");
				var xy = cellsplit.shift();
				var x = xy.match(/[a-z]+/i); x = x && x[0];
				var y = xy.match(/[0-9]+/); y = y && +y[0];
				var text = cellsplit.join("='");
				sheet.data[x] = sheet.data[x] || {};
				sheet.data[x][y] = text;
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
		// TODO
		console.error(data);
	};

	$scope.projectData = {};
	$scope.reloadProjects = function() {
		Redmine.Project.list().then(function(data) {
			$scope.projectData = data.data;
			$scope.projectData.selectIdx = "0";
		}, function(data) {
			$scope.errMsg(data);
		});
	};
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

}])

;
