/**
 * Javascript Procedures and Method Definitions for the Simplemash Plugin.
 *
 * @author: 		John Rocela(me@iamjamoy.com)
 * @author_uri:		http://iamjamoy.com
 * @copyright:		Guru Consultation Services http://gurucs.com
 * @version:		1.0.17 RC3
 * @package: 		SimpleMash
 *
 * copyright (c) 2009  J. Rocela(me@iamjamoy.com)
 *
 * This program is free software; you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation; either version 2 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program; if not, write to the Free Software
 * Foundation, Inc., 51 Franklin St, Fifth Floor, Boston, MA  02110-1301  USA
 *
 */
 
(function(){

	var $ = jQuery;
	var ajaxURL = URL + "simplemash.ajax.php";
	var request;
	
	var elemCache = [];
	var varCache = [];

	$(document).ready(function(){
		$('#simplemashbodyloading').hide();
		$('#simplemashbody').show();
		$('.simplemashtab,simplemashtab2,.hide,#addNewCategoryDiv,#addNewCategoryXMLDiv,.notice').hide();
		$('#edittab').show();
		$('.simplemashtab_tab').click(function(){
			$('.hide,.notice').hide();
			$('.simplemashtab_tab').removeClass('selected');
			$(this).addClass('selected');
			$('#cleanup').next('.setting-description').html('this will delete the <strong>entries</strong> table. not the feed url you specified.');

			$('.simplemash_editBox').remove();
			$('.siteitems').removeClass('disabled');
			$('.siteitems input').removeAttr('disabled');
			$('.siteitems a').not('.editFeedIcon,.deleteFeedIcon,.aggregateFeedIcon').unbind();
			isEditingFeed = 0;
				
			if($(this).attr('id') == 'simplemash_tab_view'){
				$('.entryitems').remove();
				$('#editentriesnone').show();
				$('#editentriesnone td').html('Loading Entries...Please Wait!');
				$('#simplemash_tab_view').css({background : "#f6f6f6", paddingRight: "8px"});
				$('#simplemash_tab_view').css({background : "#f0f0f0 url('" + URL + "img/ajax-loader2.gif') no-repeat 98% center scroll", paddingRight: "20px"});
				$('.approveEntryIcon').unbind('click');
				
				$.ajax({
					type: "POST",
					url: ajaxURL,
					data: "action=fetchFeeds",
					success: function(ret){
						var arr = [];
						arr = json_decode(ret);
						if(arr != null){
							for(i=0;i<arr.length;i++){
								if(!$('#selectFeedParent').containsOption(arr[i]['id'])){
									$('#selectFeedParent').addOption(arr[i]['id'],arr[i]['site_name'],false);
								}
							}		
							loadEntries();
						}
						else{
							$('#simplemash_tab_view').css({background : "#f0f0f0", paddingRight: "8px"});
							$('#editentriesnone').show();
							$('#editentriesnone td').html('You do not have any Entries saved! Why not add a Feed?');
						}
					}
				});
			}
			else{				
				$('.entryitems').remove();
				$('#editentriesnone').show();
				$('#editentriesnone td').html('Loading Entries...Please Wait!');
				$('#simplemash_tab_view').css({background : "#f6f6f6", paddingRight: "8px"});
			}
						
			$('#selectFeedParent').change(function(){
				$('.entryitems').remove();
				$('#editentriesnone').show();
				$('#editentriesnone td').html('Loading Entries...Please Wait!');
				$('#simplemash_tab_view').css({background : "#f6f6f6", paddingRight: "8px"});
				if($('#selectFeedParent').val() != '*'){				
					loadEntries($('#selectFeedParent').val());
				}
				else{
					loadEntries();
				}
			});	
			$('#selectStatus').change(function(){
				$('.entryitems').remove();
				$('#editentriesnone').show();
				$('#editentriesnone td').html('Loading Entries...Please Wait!');
				$('#simplemash_tab_view').css({background : "#f6f6f6", paddingRight: "8px"});
				if($('#selectStatus').val() != '*'){				
					loadEntries($('#selectStatus').val(),true);
				}
				else{
					loadEntries();
				}
			});			
		});
		$('.simplemash_tab2').click(function(){
			$('.simplemash_tab2').removeClass('selected');
			$(this).addClass('selected');
		});
		$('.closediv').click(function(){$(this).parent().hide()});
		$('#addFeedButton').click(function(){checkFeed()});
		$('#previewFeedButton').click(function(){previewFeed()});
		$('.siteitems').dblclick(function(){editItem($(this))});
		$('.siteitems').not('a').mousedown(function(){return false;});
		
		$('.aggregateFeedIcon').click(function(){
			var tid = $(this).parents('.siteitems').attr('id');
			var fid = tid.split("-");
			
			elemCache[fid[1]] = $(this).parents('.siteitems').find('.checkbox').html();
			//$(this).parents('.siteitems').find('.checkbox').html('<img src="' + URL + 'img/ajax-loader2.gif" border="0" style="margin:4px 0;"/>');
			
			aggregateFeeds(fid[1]);
		});
		$('.editFeedIcon').click(function(){editItem($(this).parents('.siteitems'))});
		$('.deleteFeedIcon').click(function(){deleteItem($(this).parents('.siteitems'))});
		
		$('#cleanup').click(function(){
			if(confirm("This will clear all Entries recorded to date. Do you wish to continue?") == true){
				$.ajax({
					type: "POST",
					url: ajaxURL,
					data: "action=cleanEntries",
					success: function(ret){
						if(ret == 1){
							$('#cleanup').next('.setting-description').html("Records has been cleared");
						}
						else{
							$('#cleanup').next('.setting-description').html("Error cleaning Entry Records");
						}
					}
				});
			}
		});
		
		$('#filterCategory').change(function(){
			if($('#filterCategory').val() == -2 || $('#filterCategory').val() == -4){
				if($('#filterCategory').val() == -2){
					$('#addNewCategoryXMLDiv').hide();
					$('#addNewCategoryDiv').show();
				}
				else{
					$('#addNewCategoryDiv').hide();
					$('#addNewCategoryXMLDiv').show();
				}
			}
			else{
				$('#addNewCategoryDiv,#addNewCategoryXMLDiv').hide();
			}
		});
		
		$('#actionFeedAggregate').click(function(){aggregateFeeds()});
		$('#actionFeedDelete').click(function(){deleteItems()});
		
		$('#approveEntries').click(function(){approveEntries()});
		$('#deleteEntries').click(function(){deleteEntries()});
		
		varCache['feedChecked'] = true;
		$('.feedCheck').click(function(){
			if(varCache['feedChecked'] == true){
				$('.feedCheck').attr('checked','checked');
				$('input[@name=feed]').attr('checked','checked');
				varCache['feedChecked'] = false;
			}
			else{
				$('.feedCheck').removeAttr('checked');
				$('input[@name=feed]').removeAttr('checked');
				varCache['feedChecked'] = true;
			}
		});
		varCache['entryChecked'] = true;
		$('.entryCheck').click(function(){
			if(varCache['entryChecked'] == true){
				$('.entryCheck').attr('checked','checked');
				$('input[@name=entry]').attr('checked','checked');
				varCache['entryChecked'] = false;
			}
			else{
				$('.entryCheck').removeAttr('checked');
				$('input[@name=entry]').removeAttr('checked');
				varCache['entryChecked'] = true;
			}
		});
		$('#feeds-table').tablesorter({headers:{0:{sorter: false},3:{sorter: false},4:{sorter: false}}});
	});
	
	function loadEntries(condition,tru){	
		var dataString = "action=fetchEntries";
		if(tru == true){
			dataString += "&condition=" + condition + "&true=true";
		}
		else if(condition){
			dataString += "&condition=" + condition;
		}
		$.ajax({
			type: "POST",
			url: ajaxURL,
			data: dataString,
			success: function(ret){					
				$('#editentriesnone').hide();
				var toAdd = [];
				toAdd = json_decode(ret);
				if(toAdd['entryCount'] > 0){
					var entry;
					var approved;
					$('#viewentry').html(' ');
					for(i = 0;i<toAdd['entryCount'];i++){
						entry = toAdd['entries'][i];
						approved = (entry['published'] > 0) ? 'Approved' : 'Pending Approval';
						//<a href="#approve" title="Approve the Entry" class="approveEntryIcon">Approve this Entry <img src="' + URL + 'img/ok.png" border="0" style="margin-bottom:-4px;"/></a>
						if($('#entryid-' + entry['id']).attr('id') != 'entryid-' + entry['id']){
							var class = '';
							var cid = '';
							if((entry['published'] > 0)){
								class = 'entryitems approveditems';
								$('#viewentry').after('<tr id="entryid-' + entry['id'] + '" pid="' + entry['published'] + '" class="' + class + '" style="cursor:pointer;"><td scope="col" class="checkbox"><input name="entry" value="' + entry['id'] + '" type="checkbox"></td><td class="name"><a href="' + entry['entry_url'] + '"><strong>' + entry['title'] + '</strong></a></td><td class="desc">' + entry['datetime'] + '</td><td class="desc">' + approved + '</td><td class="desc"><a href="#edit" class="entryEdit">Edit</a> | <a href="#delete" class="entryDelete">Delete</a></td></tr>');
							}
							else{
								class = 'entryitems';
								$('#viewentry').after('<tr id="entryid-' + entry['id'] + '" pid="' + entry['published'] + '" class="' + class + '" style="cursor:pointer;"><td scope="col" class="checkbox"><input name="entry" value="' + entry['id'] + '" type="checkbox"></td><td class="name"><a href="' + entry['entry_url'] + '"><strong>' + entry['title'] + '</strong></a></td><td class="desc">' + entry['datetime'] + '</td><td class="desc">' + approved + '</td><td class="desc"><a href="#approve" class="entryApprove">Approve</a> | <a href="#edit" class="entryEdit">Edit</a> | <a href="#delete" class="entryDelete">Delete</a></td></tr>');
							}
						}
					}
					$('#simplemash_tab_view').css({background : "#f0f0f0", paddingRight: "8px"});
					$('#editfeedsnone').remove();
					$('.approveEntryIcon, .entryApprove').click(function(){
						var tid = $(this).parents('.entryitems').attr('id');
						var fid = tid.split("-");
						approveEntry(fid[1]);
					});
					
					$('.editFeedEntry').remove();
					
					$('.approveditems').dblclick(function(){
						var pid = $(this).attr('pid');
						window.location = HOME + 'wp-admin/post.php?action=edit&post=' + pid;
					});				
					$('.entryEdit').click(function(){
						if($(this).parents('tr').hasClass('approveditems')){
							var pid = $(this).parents('tr').attr('pid');
							window.location = HOME + 'wp-admin/post.php?action=edit&post=' + pid;
						}
						else {
							editUnapprovedItem($(this).parents('tr'));
						}
					});		
					$('.entryDelete').click(function(){
						var pid = $(this).parents('tr').attr('id');
						var stid = pid.split("-");
						deleteEntry(stid[1]);
					});
					$('.entryitems').dblclick(function(){
						if($(this).hasClass('approveditems')){
							return false;
						}
						editUnapprovedItem(this);								
					});
			
					if(toAdd['entryCount'] == 0){
						$('#editentriesnone').show();
						$('#editentriesnone td').html('You do not have any Entries saved! Why not add a Feed?');
					}
					else {
						$('#feed-entries-table').tablesorter({headers:{0:{sorter: false},3:{sorter: false},4:{sorter: false}}});//.tablesorterPager({container: $("#pagination")});
					}
				}
				else{
					$('#simplemash_tab_view').css({background : "#f0f0f0", paddingRight: "8px"});
					$('#editentriesnone').show();
					$('#editentriesnone td').html('You do not have any Entries saved! Why not add a Feed?');
				}
			}
		});
	}
	
	function editUnapprovedItem(elem){
		var el = elem;
		var checkbox = $(el).find('.checkbox').html();
		$(el).find('.checkbox').html('<img src="' + URL + 'img/ajax-loader2.gif" border="0" style="margin:4px 0;"/>');
				
		$('.entryitems').show(0);
		var tid = $(el).attr('id');
		$('.editFeedEntry').remove();
		
		tid = tid.split("-");
		var pid = tid[1];
		var elem = el;
		$.ajax({
			type: "POST",
			url: ajaxURL,
			data: "action=fetchEntry&id=" + pid,
			success: function(ret){
				$(elem).hide(0);
				$(elem).find('.checkbox').html(checkbox);
				var retu = json_decode(ret);
				$('.editFeedEntry').remove();
				$(elem).after('<tr class="editFeedEntry simplemash_editBox"><td colspan="5" class="simplemash_editBox_Inner"><div id="editBox"><h3>Quick Edit Entry - ' + retu['title'] + '</h3><div style="margin: 12px;" id="editBoxInner"><table class="form-table"><tr><td>Title</td><td><input type="text" name="editEntryTitle" id="editEntryTitle" value="' + retu['title'] + '" style="width:220px;"/></td></tr><tr><td>Body</td><td><textarea name="editEntryText" id="editEntryText" style="height:200px;">' + retu['body'] + '</textarea></td></tr><tr><td colspan="2"><input type="button" value="Update" id="updateEditEntry"/><input type="button" value="Cancel" id="cancelEditEntry"/></td></tr></table></div></div></td></tr>');
				
				$('#updateEditEntry').click(function(){
					var info = [];
					info['title'] = $('#editEntryTitle').val();
					info['body'] = $('#editEntryText').val();
					$.ajax({
						type: "POST",
						url: ajaxURL,
						data: "action=saveEntry&id=" + pid + "&info=" + serialize(info),
						success: function(ret){
							if(ret == '1'){
								$('.entryitems').remove();
								$('#editentriesnone').show();
								$('#editentriesnone td').html('Loading Entries...Please Wait!');
								$('#simplemash_tab_view').css({background : "#f6f6f6", paddingRight: "8px"});
								$('#simplemash_tab_view').css({background : "#f0f0f0 url('" + URL + "img/ajax-loader2.gif') no-repeat 98% center scroll", paddingRight: "20px"});
								$('.approveEntryIcon').unbind('click');
								loadEntries();
							}
							else{
								alert('Changes could not be updated or no Update action was performed.');
								$('.entryitems').show(0);$('.editFeedEntry').remove();
							}
						}
					});
				});
				$('#cancelEditEntry').click(function(){$('.entryitems').show(0);$('.editFeedEntry').remove();});
			}
		});		
	}

	function approveEntry(id){
		var checkbox = $('#entryid-' + id).find('.checkbox').html();
		$('#entryid-' + id).find('.checkbox').html('<img src="' + URL + 'img/ajax-loader2.gif" border="0" style="margin:4px 0;"/>');
		$.ajax({
			type: "POST",
			url: ajaxURL,
			data: "action=approveEntry&id=" + id,
			success: function(ret){
				if(ret == 1){					
					$('.entryitems').remove();
					$('#editentriesnone').show();
					$('#editentriesnone td').html('Loading Entries...Please Wait!');
					$('#simplemash_tab_view').css({background : "#f6f6f6", paddingRight: "8px"});
					$('#simplemash_tab_view').css({background : "#f0f0f0 url('" + URL + "img/ajax-loader2.gif') no-repeat 98% center scroll", paddingRight: "20px"});
					$('.approveEntryIcon').unbind('click');
					loadEntries();
				}
				else {
					$('#entryid-' + id).animate({backgroundColor:"#ffd7d7"},200).animate({backgroundColor:"#ffffff"},2000);
				}
				$('#entryid-' + id).find('.checkbox').html(checkbox);
			}
		});
	}

	function approveEntries(){
		var entries = [];
		var checkbox = []
		var i = 0;
		$('input[@name=entry]:checked').each(function(){
			entries[i] = $(this).val();
			checkbox[entries[i]] = $('#entryid-' + entries[i]).find('.checkbox').html();
			$('#entryid-' + entries[i]).find('.checkbox').html('<img src="' + URL + 'img/ajax-loader2.gif" border="0" style="margin:4px 0;"/>');
			i++;
		});
		if(i > 0){
			$.ajax({
				type: "POST",
				url: ajaxURL,
				data: "action=approveEntries&entries=" + serialize(entries),
				success: function(ret){
					ret = ret.split("-");
					for(var u = 0;u<ret.length;u++){
						//Problem, doesn't delete last item
						if(ret[u] == 1){
							$('#entryid-' + entries[u]).html('');
						}
						else{
							$('#entryid-' + entries[u]).animate({backgroundColor:"#ffd7d7"},200).animate({backgroundColor:"#ffffff"},2000);
						}				
						$('#entryid-' + entries[u]).find('.checkbox').html(checkbox[u]);	
					}					
					$('.entryitems').remove();
					$('#editentriesnone').show();
					$('#editentriesnone td').html('Loading Entries...Please Wait!');
					$('#simplemash_tab_view').css({background : "#f6f6f6", paddingRight: "8px"});
					$('#simplemash_tab_view').css({background : "#f0f0f0 url('" + URL + "img/ajax-loader2.gif') no-repeat 98% center scroll", paddingRight: "20px"});
					$('.approveEntryIcon').unbind('click');
					loadEntries();
				}
			});
		}
	}

	function aggregateFeeds(id){
		var feeds = [];
		var i = 0;
		if(id){
			feeds[i] = id;
			elemCache[feeds[i]] = $('#feedid-' + feeds[i]).find('.checkbox').html();
			$('#feedid-' + feeds[i]).find('.checkbox').html('<img src="' + URL + 'img/ajax-loader2.gif" border="0" style="margin:4px 0;"/>');
			i++;
		}
		else{
			$('input[@name=feed]:checked').each(function(){
				feeds[i] = $(this).val();
				elemCache[feeds[i]] = $('#feedid-' + feeds[i]).find('.checkbox').html();
				$('#feedid-' + feeds[i]).find('.checkbox').html('<img src="' + URL + 'img/ajax-loader2.gif" border="0" style="margin:4px 0;"/>');
				i++;
			});
		}
		if(i > 0){
			$.ajax({
				type: "POST",
				url: ajaxURL,
				data: "action=aggregateFeeds&feeds=" + serialize(feeds),
				success: function(ret){
					ret = ret.split("-");
					var entryCount = ret[0];
					for(var u = 1;u<ret.length;u++){
						if(ret[u] == 1){
							$('#feedid-' + feeds[u-1]).animate({backgroundColor:"#ffffda"},200).animate({backgroundColor:"#ffffff"},2000);
						}
						else{
							$('#feedid-' + feeds[u-1]).animate({backgroundColor:"#ffd7d7"},200).animate({backgroundColor:"#ffffff"},2000);
						}
						$('#feedid-' + feeds[u-1]).find('.checkbox').html(elemCache[feeds[u-1]]);
					}
					var feedString = ((ret.length - 1) == 1) ? '': 's';						
					$('#feedNotice').show().html('<strong>Notice:</strong> Aggregated ' + entryCount + ' Entries from ' + (ret.length - 1) + ' Feed' + feedString);
				}
			});
		}
	}

	function deleteEntries(){
		if(confirm("Are you sure you want to Delete the selected Entries? You cannot undo this action. Deleting an Item will cause your unapproved items to be deleted, but posted ones intact. Click Yes to Continue") == true){
			var entries = [];
			var i = 0;
			$('input[@name=entry]:checked').each(function(){
				entries[i] = $(this).val();
				i++;
			});
			$.ajax({
				type: "POST",
				url: ajaxURL,
				data: "action=deleteEntries&entries=" + serialize(entries),
				success: function(ret){			
					ret = ret.split("-");
					var entryCount = ret[0];
					$('input[@name=entry]:checked').each(function(i){
						if(ret[i] == 1){
							$(this).parents('tr').remove();
						}
						else{
							$(this).parents('tr').animate({backgroundColor:"#ffd7d7"},200).animate({backgroundColor:"#ffffff"},2000);
						}
					});
				}
			});
		}
	}
	
	function deleteEntry(id){		
		$.ajax({
			type: "POST",
			url: ajaxURL,
			data: "action=deleteEntry&id=" + id,
			success: function(ret){
				if(ret == 1){
					$('#entryid-' + id).remove();
				}
				else{
					$('#entryid-' + id).animate({backgroundColor:"#ffd7d7"},200).animate({backgroundColor:"#ffffff"},2000);
				}
			}
		});
	}

	function deleteItems(){
		var feeds = [];
		var i = 0;
		$('input[@name=feed]:checked').each(function(){
			feeds[i] = $(this).val();
			i++;
		});
		$.ajax({
			type: "POST",
			url: ajaxURL,
			data: "action=deleteFeeds&feeds=" + serialize(feeds),
			success: function(ret){
				ret = ret.split("-");
				$('input[@name=feed]:checked').each(function(i){
					if(ret[i] == 1){
						$(this).parents('tr').remove();
					}
					else{
						$(this).parents('tr').animate({backgroundColor:"#ffd7d7"},200).animate({backgroundColor:"#ffffff"},2000);
					}
				});
			}
		});
	}

	function deleteItem(elem){
		if(confirm("Are you sure you want to Delete this Item? You cannot undo this action. Deleting an Item will cause your unapproved items to be deleted, but posted ones intact. Click Yes to Continue") == true){
			var id  = elem.attr('id');
			var idTemp = id.split('-');
			var itemID = idTemp[1];		
			$.ajax({
				type: "POST",
				url: ajaxURL,
				data: "action=deleteItem&id=" + itemID,
				success: function(ret){
					if(ret == 1){
						elem.remove();
					}
					else{
						elem.animate({backgroundColor:"#ffd7d7"},200).animate({backgroundColor:"#ffffff"},2000);
					}
				}
			});
		}
	}

	var isEditingFeed = 0;
	var editingElem;
	function editItem(elem){
		if(isEditingFeed == 0){
			$('.siteitems').addClass('disabled');
			editingElem = elem;
			elem.removeClass('disabled');
			$('.siteitems input').attr('disabled','disabled');
			$('.siteitems a').click(function(){return false});
			
			var checkbox = elem.find('.checkbox').html();
			elem.find('.checkbox').html('<img src="' + URL + 'img/ajax-loader2.gif" border="0" style="margin:4px 0;"/>');
			
			var id  = elem.attr('id');
			var idTemp = id.split('-');
			var itemID = idTemp[1];
			
			var info = [];
			
			$.ajax({
				type: "POST",
				url: ajaxURL,
				data: "action=fetchItem&id=" + itemID,
				success: function(ret){
					elem.find('.checkbox').html(checkbox);
					info = unserialize(base64_decode(ret));			
					var sitename = info['site_name'];
					var siteurl = info['feed_url'];
					var publish = info['publish_automatically'];
					var source = info['show_source'];
					var category = info['category_id'];
					var gather = info['gather'];
					var frequency = info['frequency'];
					var keep = info['keep'];
					
					var filterTitle = info['filter_from_title'];
					var filterDesc = info['filter_from_description'];
					var filterCategory = info['filter_from_category'];
					var filterBody = info['filter_from_body'];
					
					if(publish == 1){
						publish = ' checked="checked"';
					}
					if(source == 1){
						source = ' checked="checked"';
					}
			
					elem.after('<tr class="simplemash_editBox"><td colspan="5" class="simplemash_editBox_Inner ' + id + '"></td></tr>');
					$('.simplemash_editBox_Inner.' + id ).html('<div id="editBox"><h3>Edit Item &mdash; ' + sitename + '</h3><div style="margin:12px" id="editBoxInner"></div></div>');
					//$('#editBoxInner').html('<table class="form-table"><tbody><tr><th scope="row" style="width:90px;"><label for="editFeedTitle">Feed Title</label></th><td><input type="text" name="feedTitle" id="editFeedTitle" value="' + sitename + '" style="width:232px;"/></td></tr><tr><th scope="row" style="width:90px;"><label for="editAddFeed">Feed URL</label></th><td><input type="text" value="' + siteurl + '" name="addFeed" id="editAddFeed" style="width:300px;"/></td></tr><tr><th scope="row" style="width:90px;"><label for="filterFeed">Filter</label></th><td><table><tr><td style="padding:0;">Run filter against <strong>Title</strong></td><td style="padding:0;"><input type="text" value="' + filterTitle + '" id="editAddFilterTitle" name="editAddFilterTitle" style="width:212px;"/></td></tr><tr><td style="padding:0;">Run filter against <strong>Description</strong></td><td style="padding:0;"><input type="text" id="editAddFilterDesc" value="' + filterDesc + '" name="addFilterDesc" style="width:212px;"/></td></tr><tr><td style="padding:0;">Run filter against <strong>Content</strong></td><td style="padding:0;"><input type="text" id="editAddFilterContent" value="' + filterBody + '" name="addFilterContent" style="width:212px;"/></td></tr><tr><td style="padding:0;">Run filter against <strong>Category</strong></td><td style="padding:0;"><input type="text" id="editAddFilterCategory" value="' + filterCategory + '" name="addFilterCategory" style="width:212px;"/></td></tr></table><br/></td></tr><tr><th scope="row" style="width:90px;"><label for="editSelectCategory">Category</label></th><td><select name="filterCategory" id="editSelectCategory"><option value="-3" selected="selected">Select a Category</option><option value="-3" disabled="disabled">--------------</option><option value="-2">&#0187; Create New Category</option><option value="-3" disabled="disabled">--------------</option><option value="-4">&#0187; Use Custom XML Tag</option><option value="-3" disabled="disabled">--------------</option><option value="-1">&#0187; Use Original Category</option><option value="-3" disabled="disabled">--------------</option></select></tr><tr><th scope="row" style="width:90px;"><label for="editAddAutomatic">Post Automatically</label></th><td><input name="addAutomatic" id="editAddAutomatic" value="1" type="checkbox"></td></tr></tbody></table><input type="submit" value="Save Feed Information" id="saveFeedButton"/><input type="submit" value="Aggregate" id="aggregateFeedButton"/><input type="submit" value="Cancel" id="cancelFeedButton"/>');
					$('#editBoxInner').html('<table class="form-table"><tbody><tr><th scope="row" style="width:90px;"><label for="editFeedTitle">Feed Title</label></th><td><input type="text" name="feedTitle" id="editFeedTitle" value="' + sitename + '" style="width:232px;"/></td></tr><tr><th scope="row" style="width:90px;"><label for="editAddFeed">Feed URL</label></th><td><strong id="editFeedURL">' + siteurl + ' </strong><input type="button" value="Preview" id="previewFeedButton2"/><div id="simplemash_addfeedContainer2" class="hide"><a href="#tablehtml" class="simplemash_tab2 selected" onclick="jQuery(\'.simplemashtab2\').hide();jQuery(\'#simplemash_addfeedtable2\').show();">HTML</a><a href="#tableraw" class="simplemash_tab2" onclick="jQuery(\'.simplemashtab2\').hide();jQuery(\'#simplemash_addfeedraw2\').show();">Raw XML</a><a href="#addclose" style="float:right;" onclick="jQuery(\'#simplemash_addfeedContainer2\').slideUp()">close this box</a><div class="clear"></div><div class="simplemash_confirm"><div id="simplemash_addfeedtable2" class="simplemashtab2"></div><div id="simplemash_addfeedraw2" class="simplemashtab2"></div></div></td></tr><tr><th scope="row" style="width:90px;"><label for="filterFeed">Filter</label></th><td><table><tr><td style="padding:0;">Run filter against <strong>Title</strong></td><td style="padding:0;"><input type="text" value="' + filterTitle + '" id="editAddFilterTitle" name="editAddFilterTitle" style="width:212px;"/></td></tr><tr><td style="padding:0;">Run filter against <strong>Description</strong></td><td style="padding:0;"><input type="text" id="editAddFilterDesc" value="' + filterDesc + '" name="addFilterDesc" style="width:212px;"/></td></tr><tr><td style="padding:0;">Run filter against <strong>Content</strong></td><td style="padding:0;"><input type="text" id="editAddFilterContent" value="' + filterBody + '" name="addFilterContent" style="width:212px;"/></td></tr><tr><td style="padding:0;">Run filter against <strong>Category</strong></td><td style="padding:0;"><input type="text" id="editAddFilterCategory" value="' + filterCategory + '" name="addFilterCategory" style="width:212px;"/></td></tr></table><br/><span class="setting-description">You may specify a Keyword to filter out unwanted Entries from your Feed. This Entry Accepts a word or a Regex Pattern.</span></td></tr><tr><th scope="row" style="width:90px;"><label for="editSelectCategory">Category</label></th><td><select name="filterCategory2" id="editSelectCategory"><option value="-3" selected="selected">Select a Category</option><option value="-3" disabled="disabled">--------------</option><option value="-2">&#0187; Create New Category</option><option value="-3" disabled="disabled">--------------</option><option value="-1">&#0187; Use Original Category</option><option value="-3" disabled="disabled">--------------</option></select><span id="addNewCategoryDiv2">Post to a New category <input type="text" name="addNewCategory2" id="addNewCategory2" style="width:200px;color:#c0c0c0;font-size:110%;padding-bottom:2px" value="Enter new category..." onfocus="if(jQuery(this).val() == \'Enter new category...\') jQuery(this).val(\'\')" onblur="if(jQuery(this).val() == \'\') jQuery(this).val(\'Enter new category...\')"/></span><span id="addNewCategoryXMLDiv2">Create/Add to Category from XML Tag <input type="text" name="addNewCategoryXML2" id="addNewCategoryXML2" style="width:200px;color:#c0c0c0;font-size:110%;padding-bottom:2px" value="Enter XML Tag..." onfocus="if(jQuery(this).val() == \'Enter XML Tag...\') jQuery(this).val(\'\')" onblur="if(jQuery(this).val() == \'\') jQuery(this).val(\'Enter XML Tag...\')"/></span><br/><span class="setting-description">You may optionally attach this feed to a category for Automatic Posting. If Auto Detect is selected, the Feed Entry\'s category will be the feed\'s destination. else if none is selected, the plugin will store the entry for future editing.</span></td></tr><tr><th scope="row" style="width:90px;"><label for="editAddAutomatic">Post Automatically</label></th><td><input name="addAutomatic" id="editAddAutomatic" value="1" type="checkbox"' + publish + '> <span class="setting-description">You will need to approve each entry if not checked.</span></td></tr><tr><th scope="row" style="width:90px;"><label for="editHaveSource">Show Source</label></th><td><input name="editHaveSource" id="editHaveSource" value="1" type="checkbox"' + source + '> <span class="setting-description">If checked, entries under this Feed will show their original Source Location.</span></td></tr><tr><th scope="row" style="width:90px;"><label for="editgatheritems">Items to Aggregate</label></th><td><input name="editgather" id="editgatheritems" value="' + gather + '" class="small-text" type="text"> <span class="setting-description">Items to aggregate. Leave 0 if you want to aggregate maximum items.</span></td></tr><tr><th scope="row"><label for="editfrequency">Feed Capture Frequency</label></th><td><input id="editfrequency" value="' + frequency + '" class="small-text" type="text"> <span class="setting-description">Mins. show how long it takes for another aggregation to take place after the last one.</span></td</tr><tr><th scope="row"><label for="editkeep">Keep Unapproved Feeds for</label></th><td><input id="editkeep" value="' + keep + '" class="small-text" type="text"> <span class="setting-description">this will delete all unapproved items after X days.</span></td></tr></tbody></table><input type="submit" value="Save Feed Information" id="saveFeedButton"/><input type="submit" value="Aggregate" id="aggregateFeedButton"/><input type="submit" value="Cancel" id="cancelFeedButton"/><input type="submit" value="Clear Feed" id="dumpEntriesButton"/>');
					$('#addNewCategoryDiv2,#addNewCategoryXMLDiv2,#simplemash_addfeedContainer2').hide();
					
					$('#previewFeedButton2').click(function(){				
						$('#add_Wait').remove();
						$('#previewFeedButton2').after('<p id="add_Wait"><img src="' + URL + 'img/ajax-loader2.gif" border="0" style="margin:-4px 8px;"/> Please Wait <a href="#cancelajax" id="cancelAjax" style="font-size:11px;">Cancel Request</a></p>');
						$('#cancelAjax').click(function(){$('#add_Wait').hide();if(request) request.abort();});
						var dataString;
						dataString = "action=previewfeed&url=" + base64_encode($('#editFeedURL').text());
						
						if($('#editAddFilterTitle').val() != "" || $('#editAddFilterDesc').val() != "" || $('#editAddFilterContent').val() != "" || $('#editAddFilterCategory').val() != ""){
							var filters = new Array();
							var sfilter;
							filters['title'] = $('#editAddFilterTitle').val();
							filters['description'] = $('#editAddFilterDesc').val();
							filters['content'] = $('#editAddFilterContent').val();
							filters['category'] = $('#editAddFilterCategory').val();
							sfilter = serialize(filters);
							dataString = dataString + "&filter=" + sfilter
						}
						
						request = $.ajax({
							type: "POST",
							url: ajaxURL,
							data: dataString,
							success: function(ret){
								var html;
								var entry;
								var retu = new Array();
								retu = unserialize(ret);
								$('#simplemash_addfeedContainer2').show().slideDown();
								$('#simplemash_addfeedraw2').hide();
								$('#add_Wait').remove();
								
								html = "<div style=\"padding:4px;overflow:auto;height:300px;\">";
								for(i=0;i<retu['entryCount'];i++){
									entry = retu['html'][i];
									html = html + "<div style=\"padding:4px 8px;border-bottom:1px solid #c0c0c0;margin-bottom:4px;\"><h4 style=\"margin:0;padding:0\">" + entry['title'] + "</h4><p style=\"margin:0;padding:0;\">" + entry['description'] + "</p></div>";
								}
								html = html + "</div>";
								$('#simplemash_addfeedtable2').html(html);
								
								$('#simplemash_addfeedraw2').html('<textarea style="width:100%;height:300px;" readonly>' + retu['xml'] + '</textarea>');
							}
						});
					});
					
					$('#editSelectCategory').change(function(){
						if($('#editSelectCategory').val() == -2 || $('#editSelectCategory').val() == -4){
							if($('#editSelectCategory').val() == -2){
								$('#addNewCategoryXMLDiv2').hide();
								$('#addNewCategoryDiv2').show();
							}
							else{
								$('#addNewCategoryDiv2').hide();
								$('#addNewCategoryXMLDiv2').show();
							}
						}
						else{
							$('#addNewCategoryDiv2,#addNewCategoryXMLDiv2').hide();
						}
					});
					
					var Tid = id.split("-");
					var fId = Tid[1];
					$('#aggregateFeedButton').click(function(){aggregateFeeds(fId);});
					$('#saveFeedButton').click(function(){saveFeedInfo(fId);});
					$('#dumpEntriesButton').click(function(){clearEntries(fId);});
					
					for(i=0;i<info['categoryCount'];i++){
						var select = false;
						if(category == info['category'][i]['term_id']){
							select = true;
						}
						$('#editSelectCategory').addOption(info['category'][i]['term_id'],info['category'][i]['name'],select);
					}
					
					if(publish == 1){
						$('#editAutomatic').attr('checked','checked');
					}
					else{
						$('#editAutomatic').removeAttr('checked');
					}
					
					$('#cancelFeedButton').click(function(){
						$('.simplemash_editBox').remove();
						$('.siteitems').removeClass('disabled');
						$('.siteitems input').removeAttr('disabled');
						$('.siteitems a').not('.editFeedIcon,.deleteFeedIcon,.aggregateFeedIcon').unbind();
						isEditingFeed = 0;
					});
				}
			});
			isEditingFeed = 1;
		}
		else {
			editingElem.animate({backgroundColor:"#ffffda"},200).animate({backgroundColor:"#ffffff"},2000);
		}
	}

	function saveFeedInfo(id){	
		var items = [];
		
		items['id'] = id;
		items['title'] = base64_encode($('#editFeedTitle').val());
		items['url'] = base64_encode(trim($('#editFeedURL').text(),' '));
		items['filter_title'] = escape($('#editAddFilterTitle').val());
		items['filter_content'] = escape($('#editAddFilterContent').val());
		items['filter_desc'] = escape($('#editAddFilterDesc').val());
		items['filter_category'] = escape($('#editAddFilterCategory').val());
		items['category'] = $('#editSelectCategory').val();
		items['autopost'] = ($('#editAddAutomatic:checked').val()) ? 1: 0;
		items['source'] = ($('#editHaveSource:checked').val()) ? 1: 0;
		items['gather'] = $('#editgatheritems').val();
		items['frequency'] = $('#editfrequency').val();
		items['keep'] = $('#editkeep').val();
		
		$('#feedid-' + id).find('.checkbox').html('<img src="' + URL + 'img/ajax-loader2.gif" border="0" style="margin:4px 0;"/>');
		$.ajax({
			type: "POST",
			url: ajaxURL,
			data: "action=saveInfo&info=" + serialize(items),
			success: function(ret){
				if(ret == 1){
					$('.simplemash_editBox').remove();
					$('.siteitems').removeClass('disabled');
					$('.siteitems input').removeAttr('disabled');
					$('.siteitems a').not('.editFeedIcon,.deleteFeedIcon,.aggregateFeedIcon').unbind();
					isEditingFeed = 0;
					
					editingElem.animate({backgroundColor:"#ffffaa"},200).animate({backgroundColor:"#ffffff"},2000);			
				}
				else{
					editingElem.animate({backgroundColor:"#ffd7d7"},200).animate({backgroundColor:"#ffffff"},2000);
				}
				location.reload(true);
			}
		});
	}
	
	function clearEntries(id){
		if(confirm("Are you sure you want to Clear this Feed? You cannot undo this action. Deleting an Item will cause your approved and unapproved entries to be deleted. Click Yes to Continue") == true){
			$.ajax({
				type: "POST",
				url: ajaxURL,
				data: "action=clearEntries&id=" + id,
				success: function(ret){
					if(ret == 1){
						$('#dumpEntriesButton').after(' <span class="setting-description">Successfully cleared Records for this Item.</span>');
					}
					else{
						$('#dumpEntriesButton').after(' <span class="setting-description">Could not Clear the Records associated with this Item.</span>');
					}
				}
			});
		}
	}

	function previewFeed(){
		if($('#addFeed').val() == ""){
			alert('Please supply a valid URL for feed processing to begin.');
			return false;
		}
		else{
			var regexp = /(ftp|http|https):\/\/(\w+:{0,1}\w*@)?(\S+)(:[0-9]+)?(\/|\/([\w#!:.?+=&%@!\-\/]))?/
			if(!regexp.test($('#addFeed').val())){
				alert('Please check the URL structure you just provided.');
				return false;
			}
		}	
		$('#add_Wait').remove();
		$('#previewFeedButton').after('<p id="add_Wait"><img src="' + URL + 'img/ajax-loader2.gif" border="0" style="margin:-4px 8px;"/> Please Wait <a href="#cancelajax" id="cancelAjax" style="font-size:11px;">Cancel Request</a></p>');
		$('#cancelAjax').click(function(){$('#add_Wait').hide();if(request) request.abort();});
		var dataString;
		dataString = "action=previewfeed&url=" + base64_encode($('#addFeed').val());
		
		if($('#addFilterTitle').val() != "" || $('#addFilterDesc').val() != "" || $('#addFilterContent').val() != "" || $('#addFilterCategory').val() != ""){
			var filters = new Array();
			var sfilter;
			filters['title'] = $('#addFilterTitle').val();
			filters['description'] = $('#addFilterDesc').val();
			filters['content'] = $('#addFilterContent').val();
			filters['category'] = $('#addFilterCategory').val();
			sfilter = serialize(filters);
			dataString = dataString + "&filter=" + sfilter
		}
		
		request = $.ajax({
			type: "POST",
			url: ajaxURL,
			data: dataString,
			success: function(ret){
				var html;
				var entry;
				var retu = new Array();
				retu = unserialize(ret);
				$('#simplemash_addfeedContainer').slideDown();
				$('#simplemash_addfeedraw').hide();
				$('#add_Wait').remove();
				
				html = "<div style=\"padding:4px;overflow:auto;height:300px;\">";
				for(i=0;i<retu['entryCount'];i++){
					entry = retu['html'][i];
					html = html + "<div style=\"padding:4px 8px;border-bottom:1px solid #c0c0c0;margin-bottom:4px;\"><h4 style=\"margin:0;padding:0\">" + entry['title'] + "</h4><p style=\"margin:0;padding:0;\">" + entry['description'] + "</p></div>";
				}
				html = html + "</div>";
				$('#simplemash_addfeedtable').html(html);
				
				$('#simplemash_addfeedraw').html('<textarea style="width:100%;height:300px;" readonly>' + retu['xml'] + '</textarea>');
			}
		});
	}

	function checkFeed(){
		//Validate
		if($('#addFeed').val() == ""){
			alert('Please supply a valid URL for feed processing to begin.');
			return false;
		}
		if($('#filterCategory').val() == -3){
			alert('Please select a Valid Selection on the Category Dropdown Box.');
			$('#filterCategory').focus();
			return false;
		}
		if($('#filterCategory').val() == -2 && $('#addNewCategory').val() == "Enter new category..."){
			alert('Please select a new category name before proceeding!');
			$('#addNewCategory').focus();
			return false;
		}
		if($('#filterCategory').val() == -2 && $('#addNewCategory').val() == ""){
			alert('Do not leave the Field blank.');
			$('#addNewCategory').focus();
			return false;
		}
		
		//Proceed
		$('.simplemash_confirm').fadeIn();
		$('.simplemash_confirm #simplemash_confirm_container').html('Connecting to URL...');
		$.ajax({
			type: "POST",
			url: ajaxURL,
			data: "action=checkfeed&url=" + base64_encode($('#addFeed').val()),
			success: function(html){
				$('.simplemashtab_tab').removeClass('selected');
				$('#simplemash_tab_add').removeClass('selected');
				$('#simplemash_tab_add').addClass('selected');
				$('.simplemashtab').hide();
				$('#quickaddtab').show();
				$('.simplemash_confirm').fadeIn();
				$('.simplemash_confirm #simplemash_confirm_container').html(html);
				$('#addFeedYesButton').click(function(){
					$('.simplemash_confirm #simplemash_confirm_container').html('<center><img src="' + URL + 'img/ajax-loader.gif" border="0" style="margin:4px 0;"/><br/>Please Wait while we Aggregate Feeds from this URL! This may take a while depending on the Speed of Transfer.</center>');
					var dataString;
					dataString = "action=addfeed&url=" + base64_encode($('#addFeed').val()) + "&title=" + $('#feedTitle').val() + "&category=" + $('#filterCategory').val() + "&automatic=" + $('#addAutomatic:checked').val() + "&source=" + $('#haveSource:checked').val() + "&gather=" + $('#gatheritems').val() + "&frequency=" + $('#frequency').val() + "&keep=" + $('#keep').val();
					
					if($('#addFilterTitle').val() != "" || $('#addFilterDesc').val() != "" || $('#addFilterContent').val() != "" || $('#addFilterCategory').val() != ""){
						var filters = new Array();
						var sfilter;
						filters['title'] = $('#addFilterTitle').val();
						filters['description'] = $('#addFilterDesc').val();
						filters['content'] = $('#addFilterContent').val();
						filters['category'] = $('#addFilterCategory').val();
						sfilter = serialize(filters);
						dataString = dataString + "&filter=" + sfilter
					}
					
					if($('#addNewCategory').val() != ""){
						dataString = dataString + "&addCategory=" + $('#addNewCategory').val();
					}
					if($('#addNewCategoryXML').val() != ""){
						dataString = dataString + "&addCategoryXML=" + $('#addNewCategoryXML').val();
					}
					
					$.ajax({
						type: "POST",
						url: ajaxURL,
						data: dataString,
						success: function(ret){
							var toAdd = new Array();
							toAdd = unserialize(base64_decode(ret));
							if(toAdd['error'] != undefined){
								$('.simplemash_confirm #simplemash_confirm_container').html(toAdd['error']);
							}
							else {
								toAdd['filter'] = (toAdd['filter']) ? toAdd['filter']: '';							
								$('#editfeeds').prepend('<tr id="feedid-' + toAdd['id'] + '" class="siteitems"><td scope="col" class="checkbox"><input name="feed" value="' + toAdd['id'] + '" type="checkbox"></td><td class="name sitename"><a href="' + toAdd['feed_url'] + '"><strong>' + toAdd['site_name'] + '</strong></a></td><td class="desc siteurl"><a href="' + toAdd['site_url'] + '">' + toAdd['site_url'] + '</a</td><td class="desc publish">' + toAdd['updateinfo'] + '</td><td class="desc"><a href="#aggregate" title="Aggregate Feed Source" class="aggregateFeedIcon"><img src="' + URL + 'img/reload.png" border="0"/></a> <a href="#edit" title="Edit Feed Information" class="editFeedIcon"><img src="' + URL + 'img/edit.png" border="0"/></a> <a href="#delete" title="Delete Feed from Records" class="deleteFeedIcon"><img src="' + URL + 'img/delete.png" border="0"/></a></td></tr>');
								$('.siteitems').dblclick(function(){editItem($(this))});	
								$('.aggregateFeedIcon').click(function(){editItem($(this).parents('.siteitems'))});
								$('.editFeedIcon').click(function(){editItem($(this).parents('.siteitems'))});
								$('.deleteFeedIcon').click(function(){deleteItem($(this).parents('.siteitems'))});
								
								var entry;
								var approved;
								/*for(i = 0;i<toAdd['entryCount'];i++){
									entry = toAdd['entries'][i];
									approved = (entry['approved'] == 1) ? 'Approved' : 'Pending Approval'
									$('#viewentry').append('<tr id="entryid-' + entry['id'] + '"><td scope="col" class="checkbox"><input name="checked[]" value="' + entry['id'] + '" type="checkbox"></td><td class="name"><a href="' + entry['entry_url'] + '"><strong>' + base64_decode(entry['title']) + '</strong></a></td><td class="desc">' + entry['datetime'] + '</td><td class="desc">' + approved + '</td><td class="desc">' + entry['site_name'] + '</td></tr>');
								}*/
		
								$('#editfeedsnone,#editentriesnone').remove();
								
								$('.simplemashtab_tab').removeClass('selected');
								$('#simplemash_tab_edit').removeClass('selected');
								$('#simplemash_tab_edit').addClass('selected');
								$('.simplemashtab').hide();
								$('#edittab').show();
								$('.simplemash_confirm').fadeOut();
								$('#addFeed,#feedTitle,#addFilterTitle,#addFilterDesc,#addFilterContent,#addFilterCategory').val("");
							}
						}
					});
				});
				$('#addFeedNoButton').click(function(){
					$('.simplemash_confirm').fadeOut();
					$('#addFeed').val("");
				});
			}
		});

	}

	//tablesorter
	(function($){$.extend({tablesorter:new function(){var parsers=[],widgets=[];this.defaults={cssHeader:"header",cssAsc:"headerSortUp",cssDesc:"headerSortDown",sortInitialOrder:"asc",sortMultiSortKey:"shiftKey",sortForce:null,sortAppend:null,textExtraction:"simple",parsers:{},widgets:[],widgetZebra:{css:["even","odd"]},headers:{},widthFixed:false,cancelSelection:true,sortList:[],headerList:[],dateFormat:"us",decimal:'.',debug:false};function benchmark(s,d){log(s+","+(new Date().getTime()-d.getTime())+"ms");}this.benchmark=benchmark;function log(s){if(typeof console!="undefined"&&typeof console.debug!="undefined"){console.log(s);}else{alert(s);}}function buildParserCache(table,$headers){if(table.config.debug){var parsersDebug="";}var rows=table.tBodies[0].rows;if(table.tBodies[0].rows[0]){var list=[],cells=rows[0].cells,l=cells.length;for(var i=0;i<l;i++){var p=false;if($.metadata&&($($headers[i]).metadata()&&$($headers[i]).metadata().sorter)){p=getParserById($($headers[i]).metadata().sorter);}else if((table.config.headers[i]&&table.config.headers[i].sorter)){p=getParserById(table.config.headers[i].sorter);}if(!p){p=detectParserForColumn(table,cells[i]);}if(table.config.debug){parsersDebug+="column:"+i+" parser:"+p.id+"\n";}list.push(p);}}if(table.config.debug){log(parsersDebug);}return list;};function detectParserForColumn(table,node){var l=parsers.length;for(var i=1;i<l;i++){if(parsers[i].is($.trim(getElementText(table.config,node)),table,node)){return parsers[i];}}return parsers[0];}function getParserById(name){var l=parsers.length;for(var i=0;i<l;i++){if(parsers[i].id.toLowerCase()==name.toLowerCase()){return parsers[i];}}return false;}function buildCache(table){if(table.config.debug){var cacheTime=new Date();}var totalRows=(table.tBodies[0]&&table.tBodies[0].rows.length)||0,totalCells=(table.tBodies[0].rows[0]&&table.tBodies[0].rows[0].cells.length)||0,parsers=table.config.parsers,cache={row:[],normalized:[]};for(var i=0;i<totalRows;++i){var c=table.tBodies[0].rows[i],cols=[];cache.row.push($(c));for(var j=0;j<totalCells;++j){cols.push(parsers[j].format(getElementText(table.config,c.cells[j]),table,c.cells[j]));}cols.push(i);cache.normalized.push(cols);cols=null;};if(table.config.debug){benchmark("Building cache for "+totalRows+" rows:",cacheTime);}return cache;};function getElementText(config,node){if(!node)return"";var t="";if(config.textExtraction=="simple"){if(node.childNodes[0]&&node.childNodes[0].hasChildNodes()){t=node.childNodes[0].innerHTML;}else{t=node.innerHTML;}}else{if(typeof(config.textExtraction)=="function"){t=config.textExtraction(node);}else{t=$(node).text();}}return t;}function appendToTable(table,cache){if(table.config.debug){var appendTime=new Date()}var c=cache,r=c.row,n=c.normalized,totalRows=n.length,checkCell=(n[0].length-1),tableBody=$(table.tBodies[0]),rows=[];for(var i=0;i<totalRows;i++){rows.push(r[n[i][checkCell]]);if(!table.config.appender){var o=r[n[i][checkCell]];var l=o.length;for(var j=0;j<l;j++){tableBody[0].appendChild(o[j]);}}}if(table.config.appender){table.config.appender(table,rows);}rows=null;if(table.config.debug){benchmark("Rebuilt table:",appendTime);}applyWidget(table);setTimeout(function(){$(table).trigger("sortEnd");},0);};function buildHeaders(table){if(table.config.debug){var time=new Date();}var meta=($.metadata)?true:false,tableHeadersRows=[];for(var i=0;i<table.tHead.rows.length;i++){tableHeadersRows[i]=0;};$tableHeaders=$("thead th",table);$tableHeaders.each(function(index){this.count=0;this.column=index;this.order=formatSortingOrder(table.config.sortInitialOrder);if(checkHeaderMetadata(this)||checkHeaderOptions(table,index))this.sortDisabled=true;if(!this.sortDisabled){$(this).addClass(table.config.cssHeader);}table.config.headerList[index]=this;});if(table.config.debug){benchmark("Built headers:",time);log($tableHeaders);}return $tableHeaders;};function checkCellColSpan(table,rows,row){var arr=[],r=table.tHead.rows,c=r[row].cells;for(var i=0;i<c.length;i++){var cell=c[i];if(cell.colSpan>1){arr=arr.concat(checkCellColSpan(table,headerArr,row++));}else{if(table.tHead.length==1||(cell.rowSpan>1||!r[row+1])){arr.push(cell);}}}return arr;};function checkHeaderMetadata(cell){if(($.metadata)&&($(cell).metadata().sorter===false)){return true;};return false;}function checkHeaderOptions(table,i){if((table.config.headers[i])&&(table.config.headers[i].sorter===false)){return true;};return false;}function applyWidget(table){var c=table.config.widgets;var l=c.length;for(var i=0;i<l;i++){getWidgetById(c[i]).format(table);}}function getWidgetById(name){var l=widgets.length;for(var i=0;i<l;i++){if(widgets[i].id.toLowerCase()==name.toLowerCase()){return widgets[i];}}};function formatSortingOrder(v){if(typeof(v)!="Number"){i=(v.toLowerCase()=="desc")?1:0;}else{i=(v==(0||1))?v:0;}return i;}function isValueInArray(v,a){var l=a.length;for(var i=0;i<l;i++){if(a[i][0]==v){return true;}}return false;}function setHeadersCss(table,$headers,list,css){$headers.removeClass(css[0]).removeClass(css[1]);var h=[];$headers.each(function(offset){if(!this.sortDisabled){h[this.column]=$(this);}});var l=list.length;for(var i=0;i<l;i++){h[list[i][0]].addClass(css[list[i][1]]);}}function fixColumnWidth(table,$headers){var c=table.config;if(c.widthFixed){var colgroup=$('<colgroup>');$("tr:first td",table.tBodies[0]).each(function(){colgroup.append($('<col>').css('width',$(this).width()));});$(table).prepend(colgroup);};}function updateHeaderSortCount(table,sortList){var c=table.config,l=sortList.length;for(var i=0;i<l;i++){var s=sortList[i],o=c.headerList[s[0]];o.count=s[1];o.count++;}}function multisort(table,sortList,cache){if(table.config.debug){var sortTime=new Date();}var dynamicExp="var sortWrapper = function(a,b) {",l=sortList.length;for(var i=0;i<l;i++){var c=sortList[i][0];var order=sortList[i][1];var s=(getCachedSortType(table.config.parsers,c)=="text")?((order==0)?"sortText":"sortTextDesc"):((order==0)?"sortNumeric":"sortNumericDesc");var e="e"+i;dynamicExp+="var "+e+" = "+s+"(a["+c+"],b["+c+"]); ";dynamicExp+="if("+e+") { return "+e+"; } ";dynamicExp+="else { ";}var orgOrderCol=cache.normalized[0].length-1;dynamicExp+="return a["+orgOrderCol+"]-b["+orgOrderCol+"];";for(var i=0;i<l;i++){dynamicExp+="}; ";}dynamicExp+="return 0; ";dynamicExp+="}; ";eval(dynamicExp);cache.normalized.sort(sortWrapper);if(table.config.debug){benchmark("Sorting on "+sortList.toString()+" and dir "+order+" time:",sortTime);}return cache;};function sortText(a,b){return((a<b)?-1:((a>b)?1:0));};function sortTextDesc(a,b){return((b<a)?-1:((b>a)?1:0));};function sortNumeric(a,b){return a-b;};function sortNumericDesc(a,b){return b-a;};function getCachedSortType(parsers,i){return parsers[i].type;};this.construct=function(settings){return this.each(function(){if(!this.tHead||!this.tBodies)return;var $this,$document,$headers,cache,config,shiftDown=0,sortOrder;this.config={};config=$.extend(this.config,$.tablesorter.defaults,settings);$this=$(this);$headers=buildHeaders(this);this.config.parsers=buildParserCache(this,$headers);cache=buildCache(this);var sortCSS=[config.cssDesc,config.cssAsc];fixColumnWidth(this);$headers.click(function(e){$this.trigger("sortStart");var totalRows=($this[0].tBodies[0]&&$this[0].tBodies[0].rows.length)||0;if(!this.sortDisabled&&totalRows>0){var $cell=$(this);var i=this.column;this.order=this.count++%2;if(!e[config.sortMultiSortKey]){config.sortList=[];if(config.sortForce!=null){var a=config.sortForce;for(var j=0;j<a.length;j++){if(a[j][0]!=i){config.sortList.push(a[j]);}}}config.sortList.push([i,this.order]);}else{if(isValueInArray(i,config.sortList)){for(var j=0;j<config.sortList.length;j++){var s=config.sortList[j],o=config.headerList[s[0]];if(s[0]==i){o.count=s[1];o.count++;s[1]=o.count%2;}}}else{config.sortList.push([i,this.order]);}};setTimeout(function(){setHeadersCss($this[0],$headers,config.sortList,sortCSS);appendToTable($this[0],multisort($this[0],config.sortList,cache));},1);return false;}}).mousedown(function(){if(config.cancelSelection){this.onselectstart=function(){return false};return false;}});$this.bind("update",function(){this.config.parsers=buildParserCache(this,$headers);cache=buildCache(this);}).bind("sorton",function(e,list){$(this).trigger("sortStart");config.sortList=list;var sortList=config.sortList;updateHeaderSortCount(this,sortList);setHeadersCss(this,$headers,sortList,sortCSS);appendToTable(this,multisort(this,sortList,cache));}).bind("appendCache",function(){appendToTable(this,cache);}).bind("applyWidgetId",function(e,id){getWidgetById(id).format(this);}).bind("applyWidgets",function(){applyWidget(this);});if($.metadata&&($(this).metadata()&&$(this).metadata().sortlist)){config.sortList=$(this).metadata().sortlist;}if(config.sortList.length>0){$this.trigger("sorton",[config.sortList]);}applyWidget(this);});};this.addParser=function(parser){var l=parsers.length,a=true;for(var i=0;i<l;i++){if(parsers[i].id.toLowerCase()==parser.id.toLowerCase()){a=false;}}if(a){parsers.push(parser);};};this.addWidget=function(widget){widgets.push(widget);};this.formatFloat=function(s){var i=parseFloat(s);return(isNaN(i))?0:i;};this.formatInt=function(s){var i=parseInt(s);return(isNaN(i))?0:i;};this.isDigit=function(s,config){var DECIMAL='\\'+config.decimal;var exp='/(^[+]?0('+DECIMAL+'0+)?$)|(^([-+]?[1-9][0-9]*)$)|(^([-+]?((0?|[1-9][0-9]*)'+DECIMAL+'(0*[1-9][0-9]*)))$)|(^[-+]?[1-9]+[0-9]*'+DECIMAL+'0+$)/';return RegExp(exp).test($.trim(s));};this.clearTableBody=function(table){if($.browser.msie){function empty(){while(this.firstChild)this.removeChild(this.firstChild);}empty.apply(table.tBodies[0]);}else{table.tBodies[0].innerHTML="";}};}});$.fn.extend({tablesorter:$.tablesorter.construct});var ts=$.tablesorter;ts.addParser({id:"text",is:function(s){return true;},format:function(s){return $.trim(s.toLowerCase());},type:"text"});ts.addParser({id:"digit",is:function(s,table){var c=table.config;return $.tablesorter.isDigit(s,c);},format:function(s){return $.tablesorter.formatFloat(s);},type:"numeric"});ts.addParser({id:"currency",is:function(s){return/^[Â£$â‚¬?.]/.test(s);},format:function(s){return $.tablesorter.formatFloat(s.replace(new RegExp(/[^0-9.]/g),""));},type:"numeric"});ts.addParser({id:"ipAddress",is:function(s){return/^\d{2,3}[\.]\d{2,3}[\.]\d{2,3}[\.]\d{2,3}$/.test(s);},format:function(s){var a=s.split("."),r="",l=a.length;for(var i=0;i<l;i++){var item=a[i];if(item.length==2){r+="0"+item;}else{r+=item;}}return $.tablesorter.formatFloat(r);},type:"numeric"});ts.addParser({id:"url",is:function(s){return/^(https?|ftp|file):\/\/$/.test(s);},format:function(s){return jQuery.trim(s.replace(new RegExp(/(https?|ftp|file):\/\//),''));},type:"text"});ts.addParser({id:"isoDate",is:function(s){return/^\d{4}[\/-]\d{1,2}[\/-]\d{1,2}$/.test(s);},format:function(s){return $.tablesorter.formatFloat((s!="")?new Date(s.replace(new RegExp(/-/g),"/")).getTime():"0");},type:"numeric"});ts.addParser({id:"percent",is:function(s){return/\%$/.test($.trim(s));},format:function(s){return $.tablesorter.formatFloat(s.replace(new RegExp(/%/g),""));},type:"numeric"});ts.addParser({id:"usLongDate",is:function(s){return s.match(new RegExp(/^[A-Za-z]{3,10}\.? [0-9]{1,2}, ([0-9]{4}|'?[0-9]{2}) (([0-2]?[0-9]:[0-5][0-9])|([0-1]?[0-9]:[0-5][0-9]\s(AM|PM)))$/));},format:function(s){return $.tablesorter.formatFloat(new Date(s).getTime());},type:"numeric"});ts.addParser({id:"shortDate",is:function(s){return/\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/.test(s);},format:function(s,table){var c=table.config;s=s.replace(/\-/g,"/");if(c.dateFormat=="us"){s=s.replace(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/,"$3/$1/$2");}else if(c.dateFormat=="uk"){s=s.replace(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/,"$3/$2/$1");}else if(c.dateFormat=="dd/mm/yy"||c.dateFormat=="dd-mm-yy"){s=s.replace(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2})/,"$1/$2/$3");}return $.tablesorter.formatFloat(new Date(s).getTime());},type:"numeric"});ts.addParser({id:"time",is:function(s){return/^(([0-2]?[0-9]:[0-5][0-9])|([0-1]?[0-9]:[0-5][0-9]\s(am|pm)))$/.test(s);},format:function(s){return $.tablesorter.formatFloat(new Date("2000/01/01 "+s).getTime());},type:"numeric"});ts.addParser({id:"metadata",is:function(s){return false;},format:function(s,table,cell){var c=table.config,p=(!c.parserMetadataName)?'sortValue':c.parserMetadataName;return $(cell).metadata()[p];},type:"numeric"});ts.addWidget({id:"zebra",format:function(table){if(table.config.debug){var time=new Date();}$("tr:visible",table.tBodies[0]).filter(':even').removeClass(table.config.widgetZebra.css[1]).addClass(table.config.widgetZebra.css[0]).end().filter(':odd').removeClass(table.config.widgetZebra.css[0]).addClass(table.config.widgetZebra.css[1]);if(table.config.debug){$.tablesorter.benchmark("Applying Zebra widget",time);}}});})(jQuery);
	(function($){$.extend({tablesorterPager:new function(){function updatePageDisplay(c){var s=$(c.cssPageDisplay,c.container).val((c.page+1)+c.seperator+c.totalPages)}function setPageSize(table,size){var c=table.config;c.size=size;c.totalPages=Math.ceil(c.totalRows/c.size);c.pagerPositionSet=false;moveToPage(table);fixPosition(table)}function fixPosition(table){var c=table.config;if(!c.pagerPositionSet&&c.positionFixed){var c=table.config,o=$(table);if(o.offset){c.container.css({top:o.offset().top+o.height()+'px',position:'absolute'})}c.pagerPositionSet=true}}function moveToFirstPage(table){var c=table.config;c.page=0;moveToPage(table)}function moveToLastPage(table){var c=table.config;c.page=(c.totalPages-1);moveToPage(table)}function moveToNextPage(table){var c=table.config;c.page++;if(c.page>=(c.totalPages-1)){c.page=(c.totalPages-1)}moveToPage(table)}function moveToPrevPage(table){var c=table.config;c.page--;if(c.page<=0){c.page=0}moveToPage(table)}function moveToPage(table){var c=table.config;if(c.page<0||c.page>(c.totalPages-1)){c.page=0}renderTable(table,c.rowsCopy)}function renderTable(table,rows){var c=table.config;var l=rows.length;var s=(c.page*c.size);var e=(s+c.size);if(e>rows.length){e=rows.length}var tableBody=$(table.tBodies[0]);$.tablesorter.clearTableBody(table);for(var i=s;i<e;i++){var o=rows[i];var l=o.length;for(var j=0;j<l;j++){tableBody[0].appendChild(o[j])}}fixPosition(table,tableBody);$(table).trigger("applyWidgets");if(c.page>=c.totalPages){moveToLastPage(table)}updatePageDisplay(c)}this.appender=function(table,rows){var c=table.config;c.rowsCopy=rows;c.totalRows=rows.length;c.totalPages=Math.ceil(c.totalRows/c.size);renderTable(table,rows)};this.defaults={size:10,offset:0,page:0,totalRows:0,totalPages:0,container:null,cssNext:'.next',cssPrev:'.prev',cssFirst:'.first',cssLast:'.last',cssPageDisplay:'.pagedisplay',cssPageSize:'.pagesize',seperator:"/",positionFixed:true,appender:this.appender};this.construct=function(settings){return this.each(function(){config=$.extend(this.config,$.tablesorterPager.defaults,settings);var table=this,pager=config.container;$(this).trigger("appendCache");config.size=parseInt($(".pagesize",pager).val());$(config.cssFirst,pager).click(function(){moveToFirstPage(table);return false});$(config.cssNext,pager).click(function(){moveToNextPage(table);return false});$(config.cssPrev,pager).click(function(){moveToPrevPage(table);return false});$(config.cssLast,pager).click(function(){moveToLastPage(table);return false});$(config.cssPageSize,pager).change(function(){setPageSize(table,parseInt($(this).val()));return false})})}}});$.fn.extend({tablesorterPager:$.tablesorterPager.construct})})(jQuery);
	//addOption
	eval(function(p,a,c,k,e,r){e=function(c){return(c<62?'':e(parseInt(c/62)))+((c=c%62)>35?String.fromCharCode(c+29):c.toString(36))};if('0'.replace(0,e)==0){while(c--)r[e(c)]=k[c];k=[function(e){return r[e]||e}];e=function(){return'[3-9q-suw-zA-Y]'};c=1};while(c--)if(k[c])p=p.replace(new RegExp('\\b'+e(c)+'\\b','g'),k[c]);return p}(';(6(h){h.w.L=6(){5 j=6(a,f,c,g){5 d=document.createElement("S");d.r=f,d.G=c;5 b=a.C;5 e=b.s;3(!a.z){a.z={};y(5 i=0;i<e;i++){a.z[b[i].r]=i}}3(9 a.z[f]=="T")a.z[f]=e;a.C[a.z[f]]=d;3(g){d.u=8}};5 k=U;3(k.s==0)7 4;5 l=8;5 m=A;5 n,o,p;3(9(k[0])=="D"){m=8;n=k[0]}3(k.s>=2){3(9(k[1])=="M")l=k[1];q 3(9(k[2])=="M")l=k[2];3(!m){o=k[0];p=k[1]}}4.x(6(){3(4.E.B()!="F")7;3(m){y(5 a in n){j(4,a,n[a],l)}}q{j(4,o,p,l)}});7 4};h.w.ajaxAddOption=6(c,g,d,b,e){3(9(c)!="I")7 4;3(9(g)!="D")g={};3(9(d)!="M")d=8;4.x(6(){5 f=4;h.getJSON(c,g,6(a){h(f).L(a,d);3(9 b=="6"){3(9 e=="D"){b.apply(f,e)}q{b.N(f)}}})});7 4};h.w.V=6(){5 d=U;3(d.s==0)7 4;5 b=9(d[0]);5 e,i;3(b=="I"||b=="D"||b=="6"){e=d[0];3(e.H==W){5 j=e.s;y(5 k=0;k<j;k++){4.V(e[k],d[1])}7 4}}q 3(b=="number")i=d[0];q 7 4;4.x(6(){3(4.E.B()!="F")7;3(4.z)4.z=X;5 a=A;5 f=4.C;3(!!e){5 c=f.s;y(5 g=c-1;g>=0;g--){3(e.H==O){3(f[g].r.P(e)){a=8}}q 3(f[g].r==e){a=8}3(a&&d[1]===8)a=f[g].u;3(a){f[g]=X}a=A}}q{3(d[1]===8){a=f[i].u}q{a=8}3(a){4.remove(i)}}});7 4};h.w.sortOptions=6(e){5 i=h(4).Y();5 j=9(e)=="T"?8:!!e;4.x(6(){3(4.E.B()!="F")7;5 c=4.C;5 g=c.s;5 d=[];y(5 b=0;b<g;b++){d[b]={v:c[b].r,t:c[b].G}}d.sort(6(a,f){J=a.t.B(),K=f.t.B();3(J==K)7 0;3(j){7 J<K?-1:1}q{7 J>K?-1:1}});y(5 b=0;b<g;b++){c[b].G=d[b].t;c[b].r=d[b].v}}).Q(i,8);7 4};h.w.Q=6(g,d){5 b=g;5 e=9(g);3(e=="D"&&b.H==W){5 i=4;h.x(b,6(){i.Q(4,d)})};5 j=d||A;3(e!="I"&&e!="6"&&e!="D")7 4;4.x(6(){3(4.E.B()!="F")7 4;5 a=4.C;5 f=a.s;y(5 c=0;c<f;c++){3(b.H==O){3(a[c].r.P(b)){a[c].u=8}q 3(j){a[c].u=A}}q{3(a[c].r==b){a[c].u=8}q 3(j){a[c].u=A}}}});7 4};h.w.copyOptions=6(g,d){5 b=d||"u";3(h(g).size()==0)7 4;4.x(6(){3(4.E.B()!="F")7 4;5 a=4.C;5 f=a.s;y(5 c=0;c<f;c++){3(b=="all"||(b=="u"&&a[c].u)){h(g).L(a[c].r,a[c].G)}}});7 4};h.w.containsOption=6(g,d){5 b=A;5 e=g;5 i=9(e);5 j=9(d);3(i!="I"&&i!="6"&&i!="D")7 j=="6"?4:b;4.x(6(){3(4.E.B()!="F")7 4;3(b&&j!="6")7 A;5 a=4.C;5 f=a.s;y(5 c=0;c<f;c++){3(e.H==O){3(a[c].r.P(e)){b=8;3(j=="6")d.N(a[c],c)}}q{3(a[c].r==e){b=8;3(j=="6")d.N(a[c],c)}}}});7 j=="6"?4:b};h.w.Y=6(){5 a=[];4.R().x(6(){a[a.s]=4.r});7 a};h.w.selectedTexts=6(){5 a=[];4.R().x(6(){a[a.s]=4.G});7 a};h.w.R=6(){7 4.find("S:u")}})(jQuery);',[],61,'|||if|this|var|function|return|true|typeof|||||||||||||||||else|value|length||selected||fn|each|for|cache|false|toLowerCase|options|object|nodeName|select|text|constructor|string|o1t|o2t|addOption|boolean|call|RegExp|match|selectOptions|selectedOptions|option|undefined|arguments|removeOption|Array|null|selectedValues'.split('|'),0,{}))
	//base64 and utf8
	eval(function(p,a,c,k,e,r){e=function(c){return(c<62?'':e(parseInt(c/62)))+((c=c%62)>35?String.fromCharCode(c+29):c.toString(36))};if('0'.replace(0,e)==0){while(c--)r[e(c)]=k[c];k=[function(e){return r[e]||e}];e=function(){return'[4579o-qs-zA-T]'};c=1};while(c--)if(k[c])p=p.replace(new RegExp('\\b'+e(c)+'\\b','g'),k[c]);return p}('z base64_encode(a){4 c="G+/=";4 b,e,k,h,d,f,m,i,j=o=0,g="",l=[];5(!a){t a}a=H(a+\'\');I{b=a.p(j++);e=a.p(j++);k=a.p(j++);i=b<<J|e<<8|k;h=i>>K&A;d=i>>12&A;f=i>>6&A;m=i&A;l[o++]=c.q(h)+c.q(d)+c.q(f)+c.q(m)}C(j<a.u);g=l.D(\'\');switch(a.u%3){L 1:g=g.M(0,-2)+\'==\';N;L 2:g=g.M(0,-1)+\'=\';N}t g}z O(a){4 c=[],b=o=s=x=E=0;a+=\'\';C(b<a.u){s=a.p(b);5(s<y){c[o++]=7.9(s);b++}v 5((s>191)&&(s<P)){x=a.p(b+1);c[o++]=7.9(((s&31)<<6)|(x&w));b+=2}v{x=a.p(b+1);E=a.p(b+2);c[o++]=7.9(((s&15)<<12)|((x&w)<<6)|(E&w));b+=3}}t c.D(\'\')}z H(a){a=(a+\'\').Q(/\\r\\n/g,"\\n").Q(/\\r/g,"\\n");4 c="";4 b,e;4 k=0;b=e=0;k=a.u;for(4 h=0;h<k;h++){4 d=a.p(h);4 f=R;5(d<y){e++}v 5((d>127)&&(d<2048)){f=7.9((d>>6)|192)+7.9((d&w)|y)}v{f=7.9((d>>12)|P)+7.9(((d>>6)&w)|y)+7.9((d&w)|y)}5(f!=R){5(e>b){c+=a.S(b,e)}c+=f;b=e=h+1}}5(e>b){c+=a.S(b,a.u)}t c}z base64_decode(a){4 c="G+/=";4 b,e,k,h,d,f,m,i,j=o=0,g="",l=[];5(!a){t a}a+=\'\';I{h=c.B(a.q(j++));d=c.B(a.q(j++));f=c.B(a.q(j++));m=c.B(a.q(j++));i=h<<K|d<<12|f<<6|m;b=i>>J&F;e=i>>8&F;k=i&F;5(f==T){l[o++]=7.9(b)}v 5(m==T){l[o++]=7.9(b,e)}v{l[o++]=7.9(b,e,k)}}C(j<a.u);g=l.D(\'\');g=O(g);t g}',[],56,'||||var|if||String||fromCharCode|||||||||||||||ac|charCodeAt|charAt||c1|return|length|else|63|c2|128|function|0x3f|indexOf|while|join|c3|0xff|ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789|utf8_encode|do|16|18|case|slice|break|utf8_decode|224|replace|null|substring|64'.split('|'),0,{}))//serialize
	eval(function(p,a,c,k,e,r){e=function(c){return(c<a?'':e(parseInt(c/a)))+((c=c%a)>35?String.fromCharCode(c+29):c.toString(36))};if(!''.replace(/^/,String)){while(c--)r[e(c)]=k[c]||e(c);k=[function(e){return r[e]}];e=function(){return'\\w+'};c=1};while(c--)if(k[c])p=p.replace(new RegExp('\\b'+e(c)+'\\b','g'),k[c]);return p}('8 o(f){2 g=8(a){2 b=z a,6;2 c;3(b==\'7\'&&!a){n\'A\'}3(b=="7"){3(!a.r){n\'7\'}2 d=a.r.B();3(6=d.6(/(\\w+)\\(/)){d=6[1].C()}2 e=["t","u","v","p"];x(c y e){3(d==e[c]){b=e[c];4}}}n b};2 h=g(f);2 i,q=\'\';D(h){5"8":i="";4;5"E":i="F";4;5"t":i="b:"+(f?"1":"0");4;5"u":i=(G.H(f)==f?"i":"d")+":"+f;4;5"v":i="s:"+f.I+":\\""+f+"\\"";4;5"p":5"7":i="a";2 j=0;2 k="";2 l;2 m;x(m y f){q=g(f[m]);3(q=="8"){J}l=(m.6(/^[0-9]+$/)?K(m):m);k+=o(l)+o(f[m]);j++}i+=":"+j+":{"+k+"}";4}3(h!="7"&&h!="p")i+=";";n i}',47,47,'||var|if|break|case|match|object|function|||||||||||||||return|serialize|array|ktype|constructor||boolean|number|string||for|in|typeof|null|toString|toLowerCase|switch|undefined|N|Math|round|length|continue|parseInt'.split('|'),0,{}))
	//unserialize
	eval(function(p,a,c,k,e,r){e=function(c){return(c<a?'':e(parseInt(c/a)))+((c=c%a)>35?String.fromCharCode(c+29):c.toString(36))};if(!''.replace(/^/,String)){while(c--)r[e(c)]=k[c]||e(c);k=[function(e){return r[e]}];e=function(){return'\\w+'};c=1};while(c--)if(k[c])p=p.replace(new RegExp('\\b'+e(c)+'\\b','g'),k[c]);return p}('7 J(v){3 w=7(a,b,c,d){K 8 L[a](b,c,d);};3 x=7(a,b,c){3 d=[];3 e=a.B(b,b+1);3 i=2;M(e!=c){E((i+b)>a.9){w(\'N\',\'O\')}d.F(e);e=a.B(b+(i-1),b+i);i+=1}4[d.9,d.G(\'\')]};3 y=7(a,b,c){C=[];H(3 i=0;i<c;i++){3 d=a.B(b+(i-1),b+i);C.F(d)}4[C.9,C.G(\'\')]};3 z=7(a,b){E(!b)b=0;3 c=[];3 d=(a.B(b,b+1)).P();3 e=b+2;3 f=8 D(\'x\',\'4 x\');3 g=0;3 h=0;Q(d){6"i":f=8 D(\'x\',\'4 A(x)\');3 j=x(a,e,\';\');3 g=j[0];3 k=j[1];e+=g+1;5;6"b":f=8 D(\'x\',\'4 (A(x) == 1)\');3 j=x(a,e,\';\');3 g=j[0];3 k=j[1];e+=g+1;5;6"d":f=8 D(\'x\',\'4 R(x)\');3 j=x(a,e,\';\');3 g=j[0];3 k=j[1];e+=g+1;5;6"n":k=S;5;6"s":3 l=x(a,e,\':\');3 g=l[0];3 m=l[1];e+=g+2;3 j=y(a,e+1,A(m));3 g=j[0];3 k=j[1];e+=g+2;E(g!=A(m)&&g!=k.9){w(\'I\',\'T 9 U\')}5;6"a":3 k={};3 n=x(a,e,\':\');3 g=n[0];3 o=n[1];e+=g+2;H(3 i=0;i<A(o);i++){3 p=z(a,e);3 q=p[1];3 r=p[2];e+=q;3 s=z(a,e);3 t=s[1];3 u=s[2];e+=t;k[r]=u}e+=1;5;V:w(\'I\',\'W / X Y Z(s): \'+d);5}4[d,e-b,f(k)]};4 z(v,0)[2]}',62,62,'|||var|return|break|case|function|new|length|||||||||||||||||||||||||||parseInt|slice|buf|Function|if|push|join|for|SyntaxError|unserialize|throw|window|while|Error|Invalid|toLowerCase|switch|parseFloat|null|String|mismatch|default|Unknown|Unhandled|data|type'.split('|'),0,{}))
	//json_decode
	function json_decode(str_json) { 
	    var cx = /[\u0000\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g;
	    var j;
	    var text = str_json;
	 
	    var walk = function(holder, key) {
	        var k, v, value = holder[key];
	        if (value && typeof value === 'object') {
	            for (k in value) {
	                if (Object.hasOwnProperty.call(value, k)) {
	                    v = walk(value, k);
	                    if (v !== undefined) {
	                        value[k] = v;
	                    } else {
	                        delete value[k];
	                    }
	                }
	            }
	        }
	        return reviver.call(holder, key, value);
	    }
	    cx.lastIndex = 0;
	    if (cx.test(text)) {
	        text = text.replace(cx, function (a) {
	            return '\\u' +
	            ('0000' + a.charCodeAt(0).toString(16)).slice(-4);
	        });
	    }
	    if (/^[\],:{}\s]*$/.
	        test(text.replace(/\\(?:["\\\/bfnrt]|u[0-9a-fA-F]{4})/g, '@').
	            replace(/"[^"\\\n\r]*"|true|false|null|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?/g, ']').
	            replace(/(?:^|:|,)(?:\s*\[)+/g, ''))) {
	        j = eval('(' + text + ')');
	        return typeof reviver === 'function' ?
	        walk({
	            '': j
	        }, '') : j;
	    }
	    throw new SyntaxError('json_decode');
	}
	function trim(str, chars) {
		return ltrim(rtrim(str, chars), chars);
	}
	function ltrim(str, chars) {
		chars = chars || "\\s";
		return str.replace(new RegExp("^[" + chars + "]+", "g"), "");
	}	 
	function rtrim(str, chars) {
		chars = chars || "\\s";
		return str.replace(new RegExp("[" + chars + "]+$", "g"), "");
	}
})();