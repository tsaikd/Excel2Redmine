app

.factory("RedmineProject"
	, [       "RedmineCommon"
	, function(RedmineCommon) {

	function RedmineProject() {}

	RedmineProject.prototype.list = function(opts) {
		opts = angular.extend({
			url: "/projects.json"
		}, opts);

		return RedmineCommon.jsonp(opts);
	};

	RedmineProject.prototype.categories = function(opts) {
		opts = angular.extend({
			id: 0
		}, opts);
		opts.url = "/projects/" + opts.id + "/issue_categories.json";

		return RedmineCommon.jsonp(opts);
	};

	RedmineProject.prototype.memberships = function(opts) {
		opts = angular.extend({
			id: 0
		}, opts);
		opts.url = "/projects/" + opts.id + "/memberships.json";

		return RedmineCommon.jsonp(opts);
	};

	RedmineProject.prototype.versions = function(opts) {
		opts = angular.extend({
			id: 0
		}, opts);
		opts.url = "/projects/" + opts.id + "/versions.json";

		return RedmineCommon.jsonp(opts);
	};

	return new RedmineProject();
}])

;
