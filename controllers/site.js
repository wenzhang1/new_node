/*
 * site.js 首页路由
 * author: moskito
 * create_time: 2012-07-03
 * */

var config = require('../config').config;
var models = require('../models');
var EventProxy = require('eventproxy').EventProxy;
var artcileCtrl = require('./article');
var userCtrl = require('./user');
var tagCtrl = require('./tag');

exports.index = function(req, res, next){
	var render = function (articles, tags){
		res.render('index', {
			articles: articles,
			tags: tags
		});
	}
	var proxy = new EventProxy();
	proxy.assign('articles', 'tags', render);
	var where = {};
	var opt = {};
	artcileCtrl.get_articles_by_query(where, opt, function(err, articles){
		if(err) return next(err);
		
		proxy.trigger('articles', articles);
	});
	tagCtrl.get_all_tags(function(err, tags){
		if(err) return next(err);
		
		proxy.trigger('tags', tags);
	});
};
