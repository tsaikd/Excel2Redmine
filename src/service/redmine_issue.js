app

.factory("RedmineIssue"
	, [       "RedmineCommon"
	, function(RedmineCommon) {

	function RedmineIssue() {}

	RedmineIssue.prototype.list = function(opts) {
		opts = angular.extend({
			url: "/issues.json"
		}, opts);

		return RedmineCommon.jsonp(opts);
	};

	RedmineIssue.prototype.status = function(opts) {
		opts = angular.extend({
			url: "/issue_statuses.json"
		}, opts);

		return RedmineCommon.jsonp(opts);
	};

	RedmineIssue.prototype.create = function(opts) {
		opts = angular.extend({
			method: "POST",
			url: "/issues.json"
		}, opts);

		return RedmineCommon.jsonp(opts);
	};

	return new RedmineIssue();
}])

;
