/*
 * site.js 首页路由
 * author: moskito
 * create_time: 2012-07-03
 * */

var config = require('../config').config;
var models = require('../models');
var EventProxy = require('eventproxy').EventProxy;
var articleCtrl = require('./article');
var userCtrl = require('./user');
var tagCtrl = require('./tag');
var url = require('url');

exports.index = function(req, res, next){
	var current_page = parseInt(req.query.page, 10) || 1;
	var pathname = url.parse(req.url).pathname;
	//单页显示文章数量
	var limit = 1;
	
	var render = function (articles, tags, pages){
		res.render('index', {
			articles: articles,
			tags: tags,
			current_page: current_page,
			pages: pages,
			base_url: pathname
		});
	}
	var proxy = new EventProxy();
	proxy.assign('articles', 'tags', 'pages', render);
	var where = {};
	var opt = { skip: (current_page - 1) * limit, limit: limit, sort: [ ['create_time', 'desc'], ['last_reply_at', 'desc'] ]};
	articleCtrl.get_articles_by_query(where, opt, function(err, articles){
		if(err) return next(err);
		
		proxy.trigger('articles', articles);
	});
	tagCtrl.get_all_tags(function(err, tags){
		if(err) return next(err);
		
		proxy.trigger('tags', tags);
	});
	articleCtrl.get_article_counts({}, function(err, article_count){
		if(err) return next(err);
		
		var pages = Math.ceil(article_count / limit);
		proxy.trigger('pages', pages);
	});
};
