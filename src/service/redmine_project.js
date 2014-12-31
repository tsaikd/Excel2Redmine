app

.factory("RedmineProject"
	, [       "RedmineCommon"
	, function(RedmineCommon) {

	function RedmineProject() {}

	RedmineProject.prototype.list = function(opts) {
		opts = angular.extend({
			url: "/projects.json",
			params: {}
		}, opts);

		return RedmineCommon.jsonp(opts);
	};

	return new RedmineProject();
}])

;
