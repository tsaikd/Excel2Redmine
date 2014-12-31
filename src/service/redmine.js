app

.factory("Redmine"
	, [       "RedmineCommon", "RedmineProject", "RedmineIssue"
	, function(RedmineCommon,   RedmineProject,   RedmineIssue) {

	function Redmine() {}

	Redmine.prototype.Project = RedmineProject;
	Redmine.prototype.Issue = RedmineIssue;

	Redmine.prototype.trackers = function(opts) {
		opts = angular.extend({
			url: "/trackers.json"
		}, opts);

		return RedmineCommon.jsonp(opts);
	};

	Redmine.prototype.priorities = function(opts) {
		opts = angular.extend({
			url: "/enumerations/issue_priorities.json"
		}, opts);

		return RedmineCommon.jsonp(opts);
	};

	return new Redmine();
}])

;
