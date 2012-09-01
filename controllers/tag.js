/*
 * tag.js 标签管理
 * author: moskito
 * create_time: 2012-08-06
 * */
 
var config = require('../config').config;
var models = require('../models');
var articleCtrl = require('./article');
var userCtrl = require('./user');
var Tag = models.Tag;
var ArticleTag = models.ArticleTag;
var EventProxy = require('eventproxy').EventProxy;
var check = require('validator').check,
    sanitize = require('validator').sanitize;
var Util = require('../libs/utils');


//浏览标签对应的文章列表
exports.article_list = function(req, res, next){
	var tag_id = req.params.tid;
	
	ArticleTag.find({tag_id: tag_id}, function(err, articles_tag){
		if(err) return next(err);
		
		var render = function(articles, tags){
			res.render('article_list', {
				articles: articles,
				tags: tags
			});
		}
		
		var proxy = new EventProxy();
		proxy.assign('articles', 'tags', render);
		
		
		var articles_ids = [];
		for(var i = 0; i<articles_tag.length; i++){
			articles_ids.push(articles_tag[i].article_id);
		}
		
		articleCtrl.get_articles_by_query({_id:{'$in': articles_ids}}, {sort:[ ['create_time', 'desc'] ]}, function(err, articles){
			if(err) return next(err);
			
			if(!articles){
				res.render('tag_list', {error: '此标签下暂无文章'});
				return;
			}
			
			proxy.trigger('articles', articles);
		});
		
		get_all_tags(function(err, tags){
			if(err) return next(err);
			
			proxy.trigger('tags', tags);
		});
	});
}
//创建标签
exports.tag_create = function(req, res, next){
	if(!req.session || !req.session.user){
		res.render('error', {error: '对不起，你没有权限'});
		return;
	}
	
	var method = req.method.toLowerCase();
	if(method == 'get'){
		if(req.session.user.is_admin){
			res.render('tag_edit');
			return;
		}else{
			res.render('error', {error: '对不起，你没有权限'});
			return;
		}
	}
	
	if(method == 'post'){
		if(req.session.user.is_admin){
			var name = sanitize(req.body.name).trim();
			name = sanitize(name).xss();
			var order = sanitize(req.body.order).trim();
			order = sanitize(order).xss();
			var description = req.body.description;
			
			if(name == ''){
				res.render('tag_edit', {error: '标题太少或太多'});
				return;
			}
			
			try{
				check(order, '不正确的排序值').isNumeric();
			}catch(e){
				res.render('tag_edit', {error: e.message, name: name, order: order, description: description});
				return;
			}
			
			Tag.find({name: name},　function(err, tags){
				if(err) return next(err);
				
				if(tags.length>0){
					res.render('tag_edit', {errpr: '这个标签已存在', name: name, order: order, description: description});
					return;
				}
				
				tag = new Tag();
				tag.name = name;
				tag.order = order;
				tag.description = description;
				tag.save(function(err){
					if(err) return next(err);
					res.redirect('/');
				});
			});
		}else{
			res.render('error', {error: '对不起，你没有权限'});
			return;
		}
	}
};

//编辑标签
exports.tag_edit = function(req, res, next){
	if(!req.session || !req.session.user){
		res.render('error', {error: '对不起，你没有权限'});
		return;
	}
	
	var tag_id = req.params.tid;
	var method = req.method.toLowerCase();
	
	if(tag_id.length != 24){
		res.render('error', {error: '对不起，此标签已被删除或不存在'});
		return;
	}
	
	if(method == 'get'){
		if(req.session.user.is_admin){
			var where = {_id: tag_id};
			get_tag_by_query_once(where, function(err, tag){
				if(err) return next(err);
				
				if(!tag){
					res.render('error', {error: '对不起，此标签已被删除或不存在'});
					return;
				}
				
				res.render('tag_edit', {action: 'tag_edit', tag_id: tag._id, name: tag.name, order: tag.order, description: tag.description});
			});
		}else{
			res.render('error', {error: '对不起，你没有权限'});
			return;
		}
	}
	
	if(method == 'post'){
		if(req.session.user.is_admin){
			var name = sanitize(req.body.name).trim();
			name = sanitize(name).xss();
			var order = sanitize(req.body.order).trim();
			order = sanitize(order).xss();
			var description = req.body.description;
			
			if(name == ''){
				res.render('tag_edit', {error: '标题太少或太多'});
				return;
			}
			
			try{
				check(order, '不正确的排序值').isNumeric();
			}catch(e){
				res.render('tag_edit', {error: e.message, name: name, order: order, description: description});
				return;
			}
			
			var where = {_id: tag_id};
			get_tag_by_query_once(where, function(err, tag){
				if(err) return next(err);
				
				if(!tag){
					res.render('error', {error: '对不起，此标签已被删除或不存在'});
					return;
				}
				
				tag.name = name;
				tag.order = order;
				tag.description = description;
				tag.save(function(err){
					if(err) return next(err);
					
					res.redirect('/');
				})
			});
		}else{
			res.render('error', {error: '对不起，你没有权限'});
			return;
		}
	}
};

//删除标签
exports.tag_del = function(req, res, next){
	if(!req.session || !req.session.user || !req.session.user.is_admin){
		res.render('error', {error: '对不起，你没有权限'});
		return;
	}
	
	var tag_id = req.params.tid;
	if(tag_id.length != 24){
		res.render('error', {error: '对不起，此标签已被删除或不存在'});
		return;
	}
	
	var where = {_id: tag_id};
	get_tag_by_query_once(where, function(err, tag){
		if(err) return next(err);
		
		if(!tag){
			res.render('error', {error: '对不起，此标签已被删除或不存在'});
			return;
		}
		
		var proxy = new EventProxy();
		var done = function(){
			tag.remove(function(err){
				if(err) return next(err);
			})
			res.render('error', {sucess: '标签已删除'});
		}
		proxy.assign('article_tag_removed', render);
		
		where = {tag_id: tag._id};
		ArticleTag.remove(where, function(err){
			if(err) return next(err);
			
			proxy.trigger('article_tag_removed');
		});
	});
}

function get_all_tags(cb){
	Tag.find({}, [], {sort:[['order','asc']]}, function(err,tags){
		if(err) return cb(err, []);
		return cb(err, tags);
	}); 
}

function get_tag_by_query_once(where, cb){
	Tag.findOne(where, function(err, tag){
		if(err) return cb(err, null);
		return cb(err, tag);
	});
}

function get_tags_by_query(where, opt, cb){
	Tag.find(where, [], opt, function(err, tags){
		if(err) return cb(err);
		return cb(err, tags)
	});
}
exports.get_all_tags = get_all_tags;
exports.get_tag_by_query_once = get_tag_by_query_once;
exports.get_tags_by_query = get_tags_by_query;