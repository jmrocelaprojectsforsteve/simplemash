<?php
/**
 * API Class for the SimpleMash Package
 *
 * @author: 	John Rocela(me@iamjamoy.com)
 * @author_uri:	http://iamjamoy.com
 * @copyright:	Guru Consultation Services http://gurucs.com
 * @version:		1.0.17 RC3
 * @package: 	SimpleMash
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
 
/**
 * @TODO
 * Simplemash Yahoo Answers IF Structure - noticed that it is inside an approved closure.
 */
 
/**
 * If ABSPATH is not defined, load the wordpress core, mainly for AJAX calls
 */
if(!defined('ABSPATH')){	
	include '../../../wp-load.php';
}
define ('SIMPLEMASH_DEBUG', true); //recommended to leave this value as false
  
/**
 * SimpleMash Class
 */
class SimpleMash {

	/** 
	 * the global object for the feed used
	 */
	var $feed = null;
	
	/**
	 * SimpleMash
	 *
	 * class construct for the simplemash object
	 *
	 * @return void
	 */	
	function SimpleMash(){
		global $wpdb;
		
		require_once 'simplepie.inc';		
		require_once 'json.php';	
		
		$this->feed = new SimplePie();
		
		if(get_option('simplemash_usecache') == 1){
			$this->feed->enable_cache();
			$this->feed->set_cache_location(dirname(__FILE__) . DIRECTORY_SEPARATOR . 'cache');
		}
		else{
			$this->feed->enable_cache(false);
		}
		
		define('SIMPLEMASH_DB_SITES',$wpdb->prefix . 'simplemash_sites');	
		define('SIMPLEMASH_DB_ENTRIES',$wpdb->prefix . 'simplemash_entries');
		
		// Future-friendly json_encode
		if( !function_exists('json_encode') ) {
			function json_encode($data) {
				$json = new Services_JSON();
				return( $json->encode($data) );
			}
		}

		// Future-friendly json_decode
		if( !function_exists('json_decode') ) {
			function json_decode($data) {
				$json = new Services_JSON();
				return( $json->decode($data) );
			}
		}
		
		if(SIMPLEMASH_DEBUG){
			$this->fp = fopen('log.txt', 'a');
		}		
	}
	
	function log($message){		
		if(SIMPLEMASH_DEBUG){
			fwrite($this->fp, "[" . date("F j Y, H:i:s a") . "]:" . $message . "\n");
		}
	}
	
	/**
	 * __construct
	 *
	 * overridden in descendant classes
	 *
	 * @return void
	 */
	function __construct(){
		$this->SimpleMash();
	}
	
	/**
	 * wp_hook
	 *
	 * hook to the wordpress core where all actions takes place
	 *
	 * @return void
	 */
	function wp_hook(){
		
		add_action('admin_menu', array($this,'simplemash_menu'));
		add_action('wp_footer', array(&$this, 'simplemash_footer'));
		add_action('deleted_post', array($this, 'simplemash_deletepost'));
		add_action('admin_print_scripts-tools_page_simplemash/simplemash.class', array($this,'simplemash_head'));		
		
		$this->simplemash_aggregate();
		$this->simplemash_prune();
	}
	
	/**
	 * simplemash_head
	 *
	 * echo out the scripts and styles used
	 *
	 * @return void
	 */
	function simplemash_head(){
		wp_enqueue_script('feedgator','/wp-content/plugins/simplemash/simplemash.js');
		?>
		<link rel="stylesheet" type="text/css" href="<?php echo bloginfo('home'); ?>/wp-content/plugins/simplemash/simplemash.css" />
		<script type="text/javascript">
			var URL = '<?php echo bloginfo('home'); ?>/wp-content/plugins/simplemash/';
			var HOME = '<?php echo bloginfo('home'); ?>/';
		</script>
		<?php
	}
	
	/**
	 * simplemash_menu
	 *
	 * add a menu on the tools menu
	 *
	 * @return void
	 */
	function simplemash_menu(){
		add_management_page('SimpleMash v' . SIMPLEMASH_VERSION, 'SimpleMash', 8, __FILE__, array($this,'simplemash_page'));
	}
	
	/**
	 * simplemash_footer
	 *
	 * add a footer message to every blog the plugin is installed to
	 *
	 * @return void
	 */
	function simplemash_footer(){
		echo 'Powered by <a href="http://www.gurucs.com/products/simplemash">SimpleMash ' . SIMPLEMASH_VERSION . '</a>';
	}
	
	/**
	 * simplemash_aggregate
	 *
	 * the main aggregate function of the system. aggregates sites depending on update intervals. also spread out to 3 functions. TODO: Refactor
	 *
	 * @param integer $tick 
	 * @param string $url the url where aggregation will take place
	 * @return void
	 */
	function simplemash_aggregate($tick = 0, $url = null){
		global $wpdb;
		
		if($url != null){
			$this->feed->set_feed_url(str_replace(' ','+',$url));
			$this->feed->init();
		}
		
		$this->log('Started Automatic Logging of SimpleMash Sites');
		$sites = $wpdb->get_results("SELECT * FROM " . SIMPLEMASH_DB_SITES, ARRAY_A);
		if($sites){
			foreach($sites as $site){
				$this->log('Aggregating from ID:' . $site['id']);
				$updateCount = $site['updated_times'];
				$timeToNextAggregation = ($site['frequency'] * 60);
				$nextUpdate = $site['next_update'];
				$timeNow = time();
				$timeAggregateFromNow = time() + $timeToNextAggregation;
				
				if($timeNow >= $nextUpdate){
					$this->log('Aggregation Update needed. Aggregation commencing');
					if($url == null){
						$this->feed->set_feed_url(str_replace(' ','+',$site['feed_url']));
						$this->feed->init();
					}
					
					/* Determine if the url is from Yahoo */
					$isYahooAnswer = false;
					$isYahooAnswerCat = false;
					if(preg_match("/http:\/\/answers.yahoo.com\/rss\/question\?qid\=/", $site['feed_url'])){
						$isYahooAnswer = true;
					}
					else if(preg_match("/http:\/\/answers.yahoo.com\/rss\//", $site['feed_url'])){
						$isYahooAnswerCat = true;
					}
					
					if($site['filter_from_title'] != "" || $site['filter_from_description'] != "" || $site['filter_from_body'] != "" || $site['filter_from_category'] != ""){
						$filter['title'] = $site['filter_from_title'];
						$filter['description'] = $site['filter_from_description'];
						$filter['content'] = $site['filter_from_body'];				
						$filter['category'] = $site['filter_from_category'];
					}
					
					$approved = $site['publish_automatically'];

					$gather = $site['gather'];
					$entry = 0;
					foreach ($this->feed->get_items() as $item){
						$this->log('-Aggregating from ' . $item->get_permalink());
						if($entry == $gather && $entry > 0){
							break;
						}
						$check = $wpdb->get_var("SELECT count(*) FROM " . SIMPLEMASH_DB_ENTRIES . " WHERE site_id=" . $site['id'] . " AND hash='" . md5($item->get_id(true) . $item->get_permalink()) ."'");
						$this->log("--Found " . $check . " records by checking . SELECT count(*) FROM " . SIMPLEMASH_DB_ENTRIES . " WHERE site_id=" . $site['id'] . " AND hash='" . md5($item->get_id(true) . $item->get_permalink()) ."'");
						if($check == 0){
							$this->log('--No record found. Aggregating this Item. Updating the Sites table.');
							$wpdb->query("UPDATE " . SIMPLEMASH_DB_SITES . " SET last_update='" . $timeNow . "', next_update='" . $timeAggregateFromNow . "' WHERE id=" . $site['id']);
						
							$site_id = $site['id'];
							$unique = md5($item->get_id(true) . $item->get_permalink());
							$entry_url = mysql_real_escape_string($item->get_permalink());
							$title = mysql_real_escape_string($item->get_title());
							$description = mysql_real_escape_string($item->get_description());
							$body = mysql_real_escape_string($item->get_content());
							$datetime = $item->get_date();
							$acquired = time();	
							
							$allow = false;					
							if(is_array($filter)){
								if(!empty($filter['title'])){
									if($this->__simplemash_checkFilter($filter['title'],$title) == true){
										$allow = true;
									}
								}					
								if(!empty($filter['description'])){
									if($this->__simplemash_checkFilter($filter['description'],$item->get_description()) == true){
										$allow = true;
									}
								}					
								if(!empty($filter['content'])){
									if($this->__simplemash_checkFilter($filter['content'],$body) == true){
										$allow = true;
									}
								}		
								if(!empty($filter['category'])){										
									if($category = $item->get_category()){
										$category = $category->get_label();
										if($this->__simplemash_checkFilter($filter['category'],$category) == true){
											$allow = true;
										}
									}
								}
							}
							else {
								$allow = true;
							}
							
							if($allow == true){
								$this->log("--Passed Filter, commencing with Aggregation. Inserting to Database with query: INSERT INTO " . SIMPLEMASH_DB_ENTRIES . "(site_id,hash,entry_url,title,description,body,datetime,acquired,approved) VALUES($site_id,'$unique','$entry_url','$title','$description','$body','$datetime','$acquired',$approved)");
								$wpdb->query("INSERT INTO " . SIMPLEMASH_DB_ENTRIES . "(site_id,hash,entry_url,title,description,body,datetime,acquired,approved) VALUES($site_id,'$unique','$entry_url','$title','$description','$body','$datetime','$acquired',$approved)");
								$eid = $wpdb->insert_id;
								$entries = $wpdb->get_row("SELECT e.*,s.site_name FROM `" . SIMPLEMASH_DB_ENTRIES . "` e,`" . SIMPLEMASH_DB_SITES . "` s WHERE e.id=$eid AND e.site_id=s.id", ARRAY_A);
								
								if($site['show_source'] == 1){
									$body = $body . "\n\r<p>Source: <a target=\"_blank\" href=\"$entry_url\">$entry_url</a></p>";
								}
								
								if($approved == 1){
									$post = array();
									$post['post_title'] = $title;
									$post['post_excerpt'] = $description;
									$post['post_content'] = $body;
									$post['post_status'] = 'publish';
									$post['post_author'] = 1;									
									$post['post_category'] = array($site['category_id']);
									
									$published = $wpdb->get_row("SELECT * FROM $wpdb->postmeta WHERE meta_key='simplemash_entry_id' AND meta_value='$eid'");
									if($published->num_rows == 0){
										$hid = wp_insert_post($post);
										//add_post_meta($hid, 'simplemash_hash', $entries['hash']);
										add_post_meta($hid, 'simplemash_entry_id', $entries['id']);
										//$wpdb->query("DELETE FROM " . SIMPLEMASH_DB_ENTRIES . " WHERE id=" . $eid);
										$wpdb->query("UPDATE " . SIMPLEMASH_DB_ENTRIES . " SET published=$hid, approved=1 WHERE id=" . $eid);
										
										$this->log("--Item is queued to Approve. Item Posted to WP_POSTS through the wp_insert_post function. updating Entries table with query: UPDATE " . SIMPLEMASH_DB_ENTRIES . " SET published=$hid, approved=1 WHERE id=" . $eid);
										
										if($isYahooAnswerCat == true){
											$comment_url = str_replace('question/index', 'rss/question', $entries['entry_url']);
											
											$this->feed->set_feed_url(str_replace(' ','+',$comment_url));
											$this->feed->init();
											foreach ($this->feed->get_items() as $item){
												$desc = explode(":", $item->get_title());
												$author = explode(" ", $desc[0]);
												$arr['comment_post_ID'] = $hid;
												$arr['comment_author'] = ($author['1'] != '') ? $author['1']: 'Anonymous';
												$arr['comment_content'] = $item->get_description();
												wp_insert_comment($arr);
											}									
										}
									}else{
										$this->log("--Item is already published. skipping to next item");
										continue;
									}
								}
								else{
									$return['entries'][$entry]['id'] = $entries['id'];
									$return['entries'][$entry]['entry_url'] = $entries['entry_url'];
									$return['entries'][$entry]['title'] = base64_encode($entries['title']);
									$return['entries'][$entry]['datetime'] = date("j F y, g:i a", $entries['acquired']);
									$return['entries'][$entry]['approved'] = $entries['approved'];	
									$return['entries'][$entry]['site_name'] = $entries['site_name'];
								}
								$entry++;
							}
						}
					}
					
					$updateCount++;
					$wpdb->query("UPDATE " . SIMPLEMASH_DB_SITES . " SET updated_times=$updateCount, update_count=$entry, last_update='$timeNow', next_update='$timeAggregateFromNow' WHERE id=" . $site['id']);
					$this->log("Finished Aggregating\n------------");
				}
			}
		}		
	}

	/**
	 * simplemash_prune
	 *
	 * prunes entries not approved by X days. X being a global option from the wordpress core.
	 *
	 * @return void
	 */
	function simplemash_prune(){
		global $wpdb;		
		$entries = $wpdb->get_results("SELECT e.*,s.keep FROM `" . SIMPLEMASH_DB_ENTRIES . "` e,`" . SIMPLEMASH_DB_SITES . "` s ", ARRAY_A);
		
		if($entries){
			foreach($entries as $entry){
				$delete = false;
				if(time() >=  strtotime(date("c",$entry['acquired']) . " + " . $entry['keep'] . " Days")){
					$delete = true;
				}			
				if($delete == true){
					$id = $entry['id'];
					$wpdb->query("DELETE FROM " . SIMPLEMASH_DB_ENTRIES . " WHERE id=" . $id, ARRAY_A);
				}
			}
		}
	}

	/**
	 * simplemash_page
	 *
	 * outputs the basic page on the admin panel
	 *
	 * @return void
	 */
	function simplemash_page(){
		global $wpdb;
		?>
		<div id="wpbody-content">
			<div class="wrap">
				<div id="icon-tools" class="icon32"><br /></div>
				<h2>SimpleMash  <?php echo SIMPLEMASH_VERSION; ?></h2>
				<div class="tool-box" style="margin-bottom:0;">
					<h3 class="title">"Mash it Up!!!"</h3>
					<p>You are now able to import Feeds from any URL you like and narrow them down with a simple Keyword Filter and attach your Feeds to categories. Manually Approve Feeds or automatically display them on your blog.<br>
				</div>				
				<div class="clear"></div>
				
				<div id="simplemashbodyloading" style="background:#de3d4c;color:#ffffff;padding:8px;float:left;">
					Loading...
				</div>
				<div class="clear"></div>
				
				<div id="simplemashbody" style="display:none;">
				
 				<a href="#edit" id="simplemash_tab_edit" onclick="jQuery('.simplemashtab').hide();jQuery('#edittab').show();" class="simplemashtab_tab selected">Current Feeds</a>
 				<a href="#add" id="simplemash_tab_add" style="-moz-border-radius-topleft:0;margin-left:-8px;font-size:80%;font-weight:bold;padding:6px 8px 3px;" onclick="jQuery('.simplemashtab').hide();jQuery('#quickaddtab').show();" class="simplemashtab_tab">Add</a>
 				<a href="#view" id="simplemash_tab_view" onclick="jQuery('.simplemashtab').hide();jQuery('#entriestab').show();" class="simplemashtab_tab">Feed Entries</a>
				<a href="#setting" id="simplemash_tab_setting" onclick="jQuery('.simplemashtab').hide();jQuery('#settingtab').show();" class="simplemashtab_tab">Settings</a>
				<span style="font-size:80%;float:right;padding-top:4px;"><em>SimpleMash v<?php echo SIMPLEMASH_VERSION; ?></em></span>
				
				<div class="clear"></div>
				
				<div style="border:1px solid #c0c0c0;background:#f0f0f0;" id="simplemashtabcontainer">
					<div id="quickaddtab" style="margin:0;padding:8px;padding-bottom:12px;border-bottom:1px dotted #c0c0c0;" class="tool-box simplemashtab">
						<h3 class="title" style="font-size:120%;margin-top:0;">Add A Feed</h3>
						<p>Copy and Paste the RSS Feed URL to this Input box and click <em>Add Feed</em> to add the URL to the Feed list</p>
						
						<table class="form-table">
						<tbody>
						<tr>
						<th scope="row" style="width:90px;"><label for="feedTitle">Feed Title</label></th>
						<td><input type="text" name="feedTitle" id="feedTitle" style="width:232px;"/><span class="setting-description">You may specify a title for this feed if you dont want the default Feed title used.</span></td>
						</tr>
						<tr>
						<th scope="row" style="width:90px;"><label for="addFeed">Feed URL</label></th>
						<td>
							<input type="text" name="addFeed" id="addFeed" style="width:300px;"/><input type="button" value="Preview" id="previewFeedButton"/>
							<div id="simplemash_addfeedContainer" class="hide">
								<a href="#tablehtml" class="simplemash_tab2 selected" onclick="jQuery('.simplemashtab2').hide();jQuery('#simplemash_addfeedtable').show();">HTML</a>
								<a href="#tableraw" class="simplemash_tab2" onclick="jQuery('.simplemashtab2').hide();jQuery('#simplemash_addfeedraw').show();">Raw XML</a>
								<a href="#addclose" style="float:right;" onclick="jQuery('#simplemash_addfeedContainer').slideUp()">close this box</a>
								<div class="clear"></div>
								<div class="simplemash_confirm">
								<div id="simplemash_addfeedtable" class="simplemashtab2"></div>
								<div id="simplemash_addfeedraw" class="simplemashtab2"></div>
							</div>
						</td>
						</tr>
						<tr>
						<th scope="row" style="width:90px;"><label for="filterFeed">Filter</label></th>
						<td>
							<table>
								<tr>
									<td style="padding:0;">Run filter against <strong>Title</strong></td>
									<td style="padding:0;"><input type="text" id="addFilterTitle" name="addFilterTitle" style="width:212px;"/></td>
								</tr>
								<tr>
									<td style="padding:0;">Run filter against <strong>Description</strong></td>
									<td style="padding:0;"><input type="text" id="addFilterDesc" name="addFilterDesc" style="width:212px;"/></td>
								</tr>
								<tr>
									<td style="padding:0;">Run filter against <strong>Content</strong></td>
									<td style="padding:0;"><input type="text" id="addFilterContent" name="addFilterContent" style="width:212px;"/></td>
								</tr>
								<tr>
									<td style="padding:0;">Run filter against <strong>Category</strong></td>
									<td style="padding:0;"><input type="text" id="addFilterCategory" name="addFilterCategory" style="width:212px;"/></td>
								</tr>
							</table>
							<br/>
							<span class="setting-description">You may specify a Keyword to filter out unwanted Entries from your Feed. This Entry Accepts a word or a Regex Pattern.</span>
						</td>
						</tr>
						<tr>
						<th scope="row" style="width:90px;"><label for="filterCategory">Category</label></th>
						<td>
						<select name="filterCategory" id="filterCategory">
							<option value="-3" selected="selected">Select a Category</option>
							<option value="-3" disabled="disabled">--------------</option>
							<option value="-2">&#0187; Create New Category</option>
							<option value="-3" disabled="disabled">--------------</option>
							<option value="-1">&#0187; Use Original Category</option>
							<option value="-3" disabled="disabled">--------------</option>
							<option value="1">Uncategorized</option>
							<?php 
							$categories = get_categories('hide_empty=0&exclude=1'); 
							foreach ($categories as $cat) {
								echo '<option value="'.$cat->cat_ID.'">' . $cat->cat_name . '</option>';
							}
							?>
						</select>
						<span id="addNewCategoryDiv">Post to a New category <input type="text" name="addNewCategory" id="addNewCategory" style="width:200px;color:#c0c0c0;font-size:110%;padding-bottom:2px" value="Enter new category..." onfocus="if(jQuery(this).val() == 'Enter new category...') jQuery(this).val('')" onblur="if(jQuery(this).val() == '') jQuery(this).val('Enter new category...')"/></span>
						<span id="addNewCategoryXMLDiv">Create/Add to Category from XML Tag <input type="text" name="addNewCategoryXML" id="addNewCategoryXML" style="width:200px;color:#c0c0c0;font-size:110%;padding-bottom:2px" value="Enter XML Tag..." onfocus="if(jQuery(this).val() == 'Enter XML Tag...') jQuery(this).val('')" onblur="if(jQuery(this).val() == '') jQuery(this).val('Enter XML Tag...')"/></span>
						<br/>
						<span class="setting-description">You may optionally attach this feed to a category for Automatic Posting. If Auto Detect is selected, the Feed Entry's category will be the feed's destination. else if none is selected, the plugin will store the entry for future editing.</span>
						</td>
						</tr>
						<tr>
						<th scope="row" style="width:90px;"><label for="addAutomatic">Post Automatically</label></th>
						<td><input name="addAutomatic" id="addAutomatic" value="1" type="checkbox" <?php echo(get_option('simplemash_globalautopost') == 0) ? '': 'checked="checked"'; ?>> <span class="setting-description">You will need to approve each entry if not checked.</span></td>
						</tr>
						<tr>
						<th scope="row" style="width:90px;"><label for="haveSource">Show Source</label></th>
						<td><input name="haveSource" id="haveSource" value="1" type="checkbox" checked="checked"> <span class="setting-description">If checked, entries under this Feed will show their original Source Location.</span></td>
						</tr>
						<tr>
						<th scope="row" style="width:90px;"><label for="gather">Items to Aggregate</label></th>
						<td><input name="gather" id="gatheritems" value="0" class="small-text" type="text"> <span class="setting-description">Items to aggregate. Leave 0 if you want to aggregate maximum items.</span></td>
						</tr>
						<tr>
						<th scope="row"><label for="frequency">Feed Capture Frequency</label></th>
						<td><input id="frequency" value="60" class="small-text" type="text"> <span class="setting-description">Minutes. show how long it takes for another aggregation to take place after the last one.</span></td>
						</tr>
						<tr>
						<th scope="row"><label for="keep">Keep Unapproved Feeds for</label></th>
						<td><input id="keep" value="3" class="small-text" type="text"> <span class="setting-description">this will delete all unapproved items after X days.</span></td>
						</tr>
						</tbody>
						</table>
						<div class="hide simplemash_confirm">
							<a href="#" style="float:right;" class="closediv">close this box</a>
							<div id="simplemash_confirm_container"></div>
						</div>			
						<input type="submit" value="Add Feed" id="addFeedButton"/>
					</div>
					
					<div id="edittab" style="margin:0;padding:8px;padding-bottom:12px;border-bottom:1px dotted #c0c0c0;" class="tool-box simplemashtab">
						<h3 class="title" style="font-size:120%;margin-top:0;">Existing Feeds</h3>
						<p>To Edit an Item, Double click on it's Row. To Delete Feeds check the items and press Delete at the Bottom.</p>
						<table class="widefat" id="feeds-table" cellspacing="0">
							<thead>
							<tr>
								<th scope="col" class="check-column"><input type="checkbox" class="feedCheck"></th>
								<th scope="col">Feed Title</th>
								<th scope="col" style="width:260px;">Site URL</th>
								<th scope="col" style="width:140px;">Last Update</th>
								<th scope="col" style="width:56px;">Actions</th>
							</tr>
							</thead>
							<tbody id="editfeeds">
							<?php
								$sites = $wpdb->get_results("SELECT * FROM " . SIMPLEMASH_DB_SITES . " ORDER by id DESC", ARRAY_A);
								if(!empty($sites)):
								foreach($sites as $site):
									$cat = get_category($site['category_id']);
							?>
							<tr id="feedid-<?php echo $site['id']; ?>" class="siteitems">
								<td scope="col" class="checkbox"><input name="feed" value="<?php echo $site['id']; ?>" type="checkbox"></td>
								<td class="name sitename"><a target="_blank" href="<?php echo $site['feed_url']; ?>"><strong><?php echo $site['site_name']; ?></strong></a></td>
								<td class="desc siteurl"><a target="_blank" href="<?php echo $site['site_url']; ?>"><?php echo $site['site_url']; ?></a></td>
								<td class="desc publish"><?php echo htmlentities($site['update_count']) . " feeds " . $this->__simplemash_since($site['last_update']); ?></td>
								<td class="desc">
									<a href="#aggregate" title="Aggregate Feed Source" class="aggregateFeedIcon"><img src="<?php echo get_option('siteurl'); ?>/wp-content/plugins/simplemash/img/reload.png" border="0"/></a>
									<a href="#edit" title="Edit Feed Information" class="editFeedIcon"><img src="<?php echo get_option('siteurl'); ?>/wp-content/plugins/simplemash/img/edit.png" border="0"/></a>
									<a href="#delete" title="Delete Feed from Records" class="deleteFeedIcon"><img src="<?php echo get_option('siteurl'); ?>/wp-content/plugins/simplemash/img/delete.png" border="0"/></a>
								</td>
							</tr>
							<?php
								endforeach;
								else:
							?>
							<tr id="editfeedsnone">
								<td colspan="5" style="text-align:center;padding:12px 0;">You have no Feeds here. Try adding some on the <em>Quick Add</em> tab.</td>
							</tr>
							<?php
								endif;
							?>
							</tbody>
							<tfoot>
							<tr>
								<th scope="col" class="check-column"><input type="checkbox" class="feedCheck"></th>
								<th scope="col">Feed Title</th>
								<th scope="col">Site URL</th>
								<th scope="col">Last Update</th>
								<th scope="col">Actions</th>
							</tr>
							</tfoot>
						</table>
						<p id="feedNotice" class="notice"></p>
						<p class="submit" style="text-align:left;margin-bottom:0;padding-bottom:4px;">
						<input name="Submit" class="button-primary" value="Aggregate" type="submit" id="actionFeedAggregate">
						<input name="Submit" class="button-primary" value="Delete" type="submit" id="actionFeedDelete">
						</p>
					</div>
					
					<div id="entriestab" style="margin:0;padding:8px;padding-bottom:12px;border-bottom:1px dotted #c0c0c0;" class="tool-box simplemashtab">
						<h3 class="title" style="font-size:120%;margin-top:0;">View Feed Entries</h3>
						<p>View Item entries in their own window. You can only edit them once you have posted them to your blog. You can post single or multiple feeds to a category. To quickly edit a feed, double click the item you wish to edit.</p>
							<label for="selectFeedParent">Select a Feed Parent</label>
							<select style="width:200px;margin:-4px 4px 4px;" id="selectFeedParent">
								<option value="*" selected="selected">All Feeds</option>
							</select>
							<select style="width:140px;margin:-4px 4px 4px;" id="selectStatus">
								<option value="*" selected="selected">All Feeds</option>								
								<option value="approved">Approved</option>
								<option value="pending">Pending Approval</option>
							</select>
							<table class="widefat" id="feed-entries-table" cellspacing="0">
							<thead>
							<tr>
								<th scope="col" class="check-column"><input type="checkbox" class="entryCheck"></th>
								<th scope="col">Entry Title</th>
								<th scope="col" width="170">Date/Time Posted</th>
								<th scope="col" width="120">Status</th>
								<th scope="col" width="120">Actions</th>
							</tr>
							</thead>
							<tfoot>
							<tr id="editentriesnone">
								<td colspan="5" style="text-align:center;padding:12px 0;">Loading Entries...Please Wait!</td>
							</tr>
							<tr>
								<th scope="col" class="check-column"><input type="checkbox" class="entryCheck"></th>
								<th scope="col">Entry Title</th>
								<th scope="col">Date/Time Posted</th>
								<th scope="col">Status</th>
								<th scope="col">Actions</th>
							</tr>
							</tfoot>
							<tbody id="viewentry">
							</tbody>
						</table>
						
						<p class="submit" style="text-align:left;margin-bottom:0;padding-bottom:4px;">
						<input name="Submit" class="button-primary" value="Approve" type="submit" id="approveEntries">
						<input name="Submit" class="button-primary" value="Delete" type="submit" id="deleteEntries">
						</p>
					</div>
					
					<div id="settingtab" style="margin:0;padding:8px;padding-bottom:12px;border-bottom:1px dotted #c0c0c0;" class="tool-box simplemashtab">
						<h3 class="title" style="font-size:120%;margin-top:0;">Plugin Settings</h3>
						<p>Various Plugin Configuration Values may be edited through Here.</p>
							
						<form method="post" action="options.php">
						<?php wp_nonce_field('update-options'); ?>
						<table class="form-table">
						<tbody>
						<tr valign="top">
						<th scope="row"><label for="keep">Clean Entry Database</label></th>
						<td><input value="Clean Up" type="button" id="cleanup"> <span class="setting-description">this will delete the <strong>entries</strong> table. not the feed url you specified.</span></td>
						</tr>
						</tbody>
						</table>
						
						<input type="hidden" name="action" value="update" />
						<input type="hidden" name="page_options" value="simplemash_globalautopost,simplemash_aggregatetick,simplemash_capturefrequency,simplemash_keepunnaproved,simplemash_entryoutput" />

						<p class="submit" style="text-align:center;margin-bottom:0;padding-bottom:4px;">
						<input name="Submit" class="button-primary" value="Save Settings" type="submit">
						</p>
						</form>
						
					</div>
					
				</div>
				</div>
			</div>
			
			</div>
		
			<div class="clear"></div>		
			<center style="font-size:80%;margin-top:8px;">This Plugin is brought to you by: <a href="http://www.gurucs.com/products/simplemash">Guru Consulting Services</a></center>
		
		</div>
		<?php
	}
	
	/**
	 * simplemash_ajax_checkfeed
	 *
	 * check if the URL is valid and return the proper information response
	 *
	 * @param string $url URL of the feed
	 * @return string
	 */
	function simplemash_ajax_checkfeed($url){
		$url = base64_decode($url);
		$this->feed->set_feed_url(str_replace(' ','+',$url));
		$this->feed->init();
		if(!preg_match('/^(http|https):\/\/([A-Z0-9][A-Z0-9_-]*(?:\.[A-Z0-9][A-Z0-9_-]*)+):?(\d+)?\/?/i',$url)):
		?>
		The URL you provided is not Valid. Please Try Again.
		<?php
		else:
			if(count($this->feed->get_items()) > 0):
		?>	
		The URL you provided returned this Information
		<span><?php echo $this->feed->get_title(); ?></span> on <span><?php echo $this->feed->get_permalink(); ?></span>
		<br/>
		<input type="hidden" value="<?php echo $url; ?>" name="addFeedURL" id="addFeedURL"/>
		Is this Correct? <input type="submit" value="Yes" id="addFeedYesButton"/> <input type="submit" value="No" id="addFeedNoButton"/>
		<?php
			else:
		?>
			We could not connect to the given URL, please try again as it may seem that there has been a lapse with the connection, an invalid XML document or also make sure that the Feed URL is valid.
		<?php
			endif;
		endif;
	}
	
	/**
	 * simplemash_ajax_previewfeed
	 *
	 * fetches the raw XML and a formatted entry and returns it as response
	 *
	 * @param string $url URL of the feed
	 * @param string $filter a serialized array of filters to run against
	 * @return string
	 */
	function simplemash_ajax_previewfeed($url,$filter = null){
		$url = base64_decode($url);
		$this->feed->set_feed_url(str_replace(' ','+',trim($url)));
		$this->feed->init();
		
		$items = array();
		$i = 0;
		if($filter != null){
			$filters = unserialize(stripslashes($filter));
		}
		
		if(count($this->feed->get_items()) > 0){
			foreach($this->feed->get_items() as $item){
				$allowed_title = null;
				$allowed_desc = null;
				if($filters != null){
					$allow = false;
					if(!empty($filters['title'])){
						if($this->__simplemash_checkFilter($filters['title'],$item->get_title()) == true){
							$pattern = $filters['title'];
							$replacement = '<strong style="color:red;">' . $filters['title'] . '</strong>';
							$allowed_title = str_replace($pattern, $replacement, $item->get_title());
							$allow = true;
						}
					}					
					if(!empty($filters['description'])){
						if($this->__simplemash_checkFilter($filters['description'],$item->get_description()) == true){
							$pattern = $filters['description'];
							$replacement = '<em style="color:red;">' . $filters['description'] . '</em>';
							$allowed_desc = str_replace($pattern, $replacement, $item->get_description());
							$allow = true;
						}
					}					
					if(!empty($filters['content'])){
						if($this->__simplemash_checkFilter($filters['content'],$item->get_content()) == true){
							$allow = true;
						}
					}		
					if(!empty($filters['category'])){										
						if($category = $item->get_category()){
							$category = $category->get_label();
							if($this->__simplemash_checkFilter($filters['category'],$category) == true){
								$allow = true;
							}
						}
					}
					
					if($allow == true){
						$items[$i]['title'] = ($allowed_title) ? $allowed_title: htmlentities($item->get_title());
						$items[$i]['description'] = ($allowed_desc) ? $allowed_desc: htmlentities($item->get_description());
						$i++;
					}
				}
				else{
					$items[$i]['title'] = htmlentities($item->get_title());
					$items[$i]['description'] = htmlentities($item->get_description());
					$i++;
				}
			}
			if($i == 0){
				$items[$i]['title'] = 'Sorry! Please Try Again!';
				$items[$i]['description'] = 'It seems that the filter you supplied cannot match the entries of the Feed you provided. Try providing a clearer match.';
				$i++;
			}
		}
		else{
			$items[$i]['title'] = 'Sorry! Please Try Again!';
			$items[$i]['description'] = 'It seems that the URL you entered is invalid or does not contain any feeds, also, check your filters.';
			$i++;
		}
		$return['entryCount'] = $i;
		$return['html'] = $items;
		$return['xml'] = htmlentities(file_get_contents(str_replace(' ','+',trim($url))));
		echo serialize($return);		
	}
	
	/**
	 * simplemash_ajax_addfeed
	 *
	 * run after simplemash_ajax_checkFeed that adds the information given from an AJAX request
	 *
	 * @param string $url URL of the feed
	 * @return string
	 */
	function simplemash_ajax_addfeed($url, $title = null, $filter = null, $category = null, $automatic = null, $source = null, $gather = null, $frequency = null, $keep = null, $addCategory = null, $addCategoryXML = null){
		global $wpdb;
		
		$url = base64_decode($url);
		
		/* Determine if the url is from Yahoo */
		$isYahooAnswer = false;
		$isYahooAnswerCat = false;
		if(preg_match("/http:\/\/answers.yahoo.com\/rss\/question\?qid\=/", $url)){
			$isYahooAnswer = true;
		}
		else if(preg_match("/http:\/\/answers.yahoo.com\/rss\//", $url)){
			$isYahooAnswerCat = true;
		}
		
		$this->feed->set_feed_url(str_replace(' ','+',$url));
		$this->feed->init();
		
		$this->log('Started Logging of New SimpleMash Site');
		
		if($this->feed->get_title() != null){
			$timeToNextAggregation = ($frequency * 60);
			$timeNow = time();
			$timeAggregateFromNow = time() + $timeToNextAggregation;
			
			if(SIMPLEMASH_DEBUG == true){
				$wpdb->show_errors();
			}	
			if($filter != null){
				$filter = unserialize(stripslashes($filter));
			}
			$filter_from_title = (@$filter['title']) ? $filter['title']: '';
			$filter_from_body = (@$filter['content']) ? $filter['content']: '';
			$filter_from_description = (@$filter['description']) ? $filter['description']: '';
			$filter_from_category = (@$filter['category']) ? $filter['category']: '';
			
			if($category == -1 || $category == -2){
				include '../../../wp-admin/admin-functions.php';
			}
			
			if($category == -2){
				if($addCategory != "" && $addCategory != "Enter new category..." ){
					$cat_info = array(
						"cat_name" => $addCategory,
						"category_nicename" => $addCategory,
					);
					$category_id = wp_insert_category($cat_info);
				}
				else{
					$category_id = 1;
				}
			}
			else{
				$category_id = $category;
			}			
			
			$approved = ($automatic != null && $automatic != "undefined") ? $automatic: 0;
			$source = ($source != null && $source != "undefined") ? 1: 0;
			$gather = ($gather > 0) ? $gather: 0;
			$frequency = ($frequency > 0) ? $frequency: 60;
			$keep = ($keep > 0) ? $keep: 3;
			
			$title = ($title != null && $title != "undefined") ? $title: $this->feed->get_title();

			$wpdb->query("INSERT INTO " . SIMPLEMASH_DB_SITES . "(feed_url,site_name,site_url,description,last_update,next_update,filter_from_title,filter_from_body,filter_from_description,filter_from_category,category_id,publish_automatically,show_source,gather,frequency,keep) VALUES('$url','" . $title . "','" . $this->feed->get_permalink() . "','','" . $timeNow . "','" . $timeAggregateFromNow . "','" . $filter_from_title . "','" . $filter_from_body . "','" . $filter_from_description . "','" . $filter_from_category . "','" . $category_id . "'," . $approved . "," . $source . "," . $gather . "," . $frequency . "," . $keep . ")");
			$id = $wpdb->insert_id;
			$return = $wpdb->get_row("SELECT id,feed_url,site_url,site_name FROM " . SIMPLEMASH_DB_SITES . " WHERE id=$id", ARRAY_A);

			$this->log("-Inserted Site with Query: INSERT INTO " . SIMPLEMASH_DB_SITES . "(feed_url,site_name,site_url,description,last_update,next_update,filter_from_title,filter_from_body,filter_from_description,filter_from_category,category_id,publish_automatically,show_source,gather,frequency,keep) VALUES('$url','" . $title . "','" . $this->feed->get_permalink() . "','','" . $timeNow . "','" . $timeAggregateFromNow . "','" . $filter_from_title . "','" . $filter_from_body . "','" . $filter_from_description . "','" . $filter_from_category . "','" . $category_id . "'," . $approved . "," . $source . "," . $gather . "," . $frequency . "," . $keep . ")");
			
			$cat = get_category($category_id);
			$return['autopost'] = ($approved == 1) ? 'Yes': 'No';
			$return['category'] = $cat->cat_name;
			$return['updateinfo'] = $gather . " feeds Seconds ago";
			
			
			if($isYahooAnswer == true){
				$post = array();
				$post['post_title'] = mysql_real_escape_string($this->feed->get_title());
				$post['post_excerpt'] = mysql_real_escape_string($this->feed->get_description());
				$body = mysql_real_escape_string($this->feed->get_description());
				if($source == 1){
					$body = $body . "\n\r<p>Source: <a target=\"_blank\" href=\"" . $this->feed->get_permalink() . "\">" . $this->feed->get_permalink() . "</a></p>";
				}
				$post['post_content'] = $body; //Couldnt get parent description
				$post['post_status'] = 'publish';
				$post['post_author'] = 1;
				$post['post_category'][] = $category_id;
				$yid = wp_insert_post($post);
				$wpdb->query("UPDATE " . SIMPLEMASH_DB_SITES . " SET post_id=$yid WHERE id=$id");
			}
			
			$entry = 0;
			foreach ($this->feed->get_items() as $item){
				$this->log('-Aggregating from ' . $item->get_permalink());
				if($entry == $gather && $entry > 0 && $isYahooAnswer != true){
					break;
				}
				$check = $wpdb->get_var("SELECT count(*) FROM " . SIMPLEMASH_DB_ENTRIES . " WHERE site_id=" . $id . " AND hash='" . md5($item->get_id(true) . $item->get_permalink()) ."'");
				$this->log("--Found " . $check . " records by checking . SELECT count(*) FROM " . SIMPLEMASH_DB_ENTRIES . " WHERE site_id=" . $id . " AND hash='" . md5($item->get_id(true) . $item->get_permalink()) ."'");
				if($check == 0){
					$this->log('--No record found. Aggregating this Item. Updating the Sites table.');
					$site_id = $id;
					$unique = md5($item->get_id(true) . $item->get_permalink());
					$entry_url = $item->get_permalink();
					$title = mysql_real_escape_string($item->get_title());
					$description = mysql_real_escape_string($item->get_description());
					$body = (@$item->get_content()) ? mysql_real_escape_string(htmlspecialchars_decode($item->get_content())): '';
					$datetime = $item->get_date();
					$acquired = time();	
					$published = ($approved == 1) ? 1: 0;
					$time_published = ($approved == 1) ? "0000000000": time();
					
					if($isYahooAnswer == true){
						$desc = explode(":", $item->get_title());
						$author = explode(" ", $desc[0]);
						$arr['comment_post_ID'] = $yid;
						$arr['comment_author'] = ($author['1'] != '') ? $author['1']: 'Anonymous';
						//$arr['comment_author_email'] = '';
						//$arr['comment_author_url'] = ;
						$arr['comment_content'] = $item->get_description();
						//$arr['comment_type'] = ;
						//$arr['user_ID'] = ;						
						wp_insert_comment($arr);						
					}
					else {
						if($category == -1){
							if(is_array($item->get_categories())){
								foreach($item->get_categories() as $category){
									$label = $category->get_label();
									if($cat_id = get_cat_id($label)){								
										$categories[] = $cat_id;
									}
									else {
										$cat_info = array(
											"cat_name" => $label,
											"category_nicename" => $label,
										);
										$categories[] = wp_insert_category($cat_info);
									}
								}
							}						
							elseif($category = $item->get_category()){
								$label = $category->get_label();
								if($cat_id = get_cat_id($label)){								
									$categories[] = $cat_id;
								}
								else {
									$cat_info = array(
										"cat_name" => $label,
										"category_nicename" => $label,
									);
									$categories[] = wp_insert_category($cat_info);
								}
							}
							else {
								$categories = array(1);
							}
						}
						else {
							$categories = array($category_id);
						}
						
						$allow = false;					
						if(is_array($filter)){
							if(!empty($filter['title'])){
								if($this->__simplemash_checkFilter($filter['title'],$title) == true){
									$allow = true;
								}
							}					
							if(!empty($filter['description'])){
								if($this->__simplemash_checkFilter($filter['description'],$item->get_description()) == true){
									$allow = true;
								}
							}					
							if(!empty($filter['content'])){
								if($this->__simplemash_checkFilter($filter['content'],$body) == true){
									$allow = true;
								}
							}		
							if(!empty($filter['category'])){										
								if($category = $item->get_category()){
									$category = $category->get_label();
									if($this->__simplemash_checkFilter($filter['category'],$category) == true){
										$allow = true;
									}
								}
							}
						}
						else {
							$allow = true;
						}
						
						if($allow == true){
							$this->log("--Passed Filter, commencing with Aggregation. Inserting to Database with query: INSERT INTO " . SIMPLEMASH_DB_ENTRIES . "(site_id,hash,entry_url,title,description,body,datetime,acquired,approved) VALUES($site_id,'$unique','$entry_url','$title','$description','$body','$datetime','$acquired',$approved)");
							$cat_id = implode(",",$categories);
							$wpdb->query("INSERT INTO " . SIMPLEMASH_DB_ENTRIES . "(site_id,hash,entry_url,title,description,body,datetime,acquired,approved,published,time_published,category_id) VALUES($site_id,'$unique','$entry_url','$title','$description','$body','$datetime','$acquired',$approved,$published,$time_published,'$cat_id')");
							$eid = $wpdb->insert_id;
							$entries = $wpdb->get_row("SELECT e.*,s.site_name FROM `" . SIMPLEMASH_DB_ENTRIES . "` e,`" . SIMPLEMASH_DB_SITES . "` s WHERE e.id=$eid AND e.site_id=s.id", ARRAY_A);
							
							if($source == 1){
								$body = $body . "\n\r<p>Source: <a target=\"_blank\" href=\"$entry_url\">$entry_url</a></p>";
							}

							if($approved == 1){
								$post = array();
								$post['post_title'] = $title;								
								$post['post_excerpt'] = $description;
								$post['post_content'] = $body;
								$post['post_status'] = 'publish';
								$post['post_author'] = 1;
								$post['post_category'] = $categories;
								
								$published = $wpdb->get_row("SELECT * FROM $wpdb->postmeta WHERE meta_key='simplemash_entry_id' AND meta_value='$eid'");
								if($published->num_rows == 0){
									$hid = wp_insert_post($post);
									//add_post_meta($hid, 'simplemash_hash', $entries['hash']);
									add_post_meta($hid, 'simplemash_entry_id', $entries['id']);
									//$wpdb->query("DELETE FROM " . SIMPLEMASH_DB_ENTRIES . " WHERE id=" . $eid);
									$wpdb->query("UPDATE " . SIMPLEMASH_DB_ENTRIES . " SET published=$hid, approved=1 WHERE id=" . $eid);
									
									$this->log("--Item is queued to Approve. Item Posted to WP_POSTS through the wp_insert_post function. updating Entries table with query: UPDATE " . SIMPLEMASH_DB_ENTRIES . " SET published=$hid, approved=1 WHERE id=" . $eid);
										
									if($isYahooAnswerCat == true){
										$comment_url = str_replace('question/index', 'rss/question', $entries['entry_url']);
										
										$this->feed->set_feed_url(str_replace(' ','+',$comment_url));
										$this->feed->init();
										foreach ($this->feed->get_items() as $item){
											$desc = explode(":", $item->get_title());
											$author = explode(" ", $desc[0]);
											$arr['comment_post_ID'] = $hid;
											$arr['comment_author'] = ($author['1'] != '') ? $author['1']: 'Anonymous';
											$arr['comment_content'] = $item->get_description();
											wp_insert_comment($arr);
										}									
									}
								}else{
									$this->log("--Item is already published. skipping to next item");
									continue;
								}
								
							}
							else{
								$return['entries'][$entry]['id'] = $entries['id'];
								$return['entries'][$entry]['entry_url'] = $entries['entry_url'];
								$return['entries'][$entry]['title'] = base64_encode($entries['title']);
								$return['entries'][$entry]['datetime'] = date("j F y, g:i a", $entries['acquired']);
								$return['entries'][$entry]['approved'] = $entries['approved'];	
								$return['entries'][$entry]['site_name'] = $entries['site_name'];
							}
							$entry++;
						}
					}
				}
			}
			$return['entryCount'] = $entry;
			$this->log("Finished Aggregating\n------------");
		}
		else {
			$return['error'] = "We could connect to the URL you provided at this time. Please Try Again!";
		}
		if(is_array($return['entries'])){
			$return['entries'] = array_reverse($return['entries']);
		}
		echo base64_encode(serialize($return));
	}
	
	/**
	 * simplemash_ajax_cleanentries
	 *
	 * clean the Entry Table as requested by an AJAX call
	 *
	 * @return void
	 */
	function simplemash_ajax_cleanentries(){
		global $wpdb;		
		if($wpdb->query("DELETE FROM " . SIMPLEMASH_DB_ENTRIES)){
			$wpdb->query("TRUNCATE TABLE " . SIMPLEMASH_DB_ENTRIES);
			return 1;
		}
		return 0;
	}
	
	/**
	 * simplemash_ajax_fetchItem
	 *
	 * fetch an Item information from database
	 *
	 * @param string $id ID of the item to be fetched
	 * @return string
	 */
	function simplemash_ajax_fetchItem($id){
		global $wpdb;
		$return = $wpdb->get_row("SELECT * FROM " . SIMPLEMASH_DB_SITES . " WHERE id=" . $id, ARRAY_A);
		$results = $wpdb->get_results("SELECT * FROM $wpdb->terms", ARRAY_A);
		$return['category'] = $results;
		$return['categoryCount'] = count($results);
		echo base64_encode(serialize($return));
	}

	/**
	 * simplemash_ajax_fetchEntries
	 *
	 * fetch entries from database and dynamically fill the tables on the admin panel
	 *
	 * @param string $condition optional conditon to attach to the fetch SQL
	 * @return JSON
	 */
	function simplemash_ajax_fetchEntries($condition = null, $true = null){
		global $wpdb;
		if($true == 'true'){
			if($condition == 'approved'){
				$condition = "AND e.approved=1 AND e.published>0 ";
			}
			else{
				$condition = "AND e.approved=0 AND e.published=0 ";
			}
		}
		else if($condition != null){
			$condition = "AND s.id=" . $condition . " ";
		}
		else {
			// $condition = "AND e.published=0 ";
			$condition = "";
		}
		$result = array();
		$results = $wpdb->get_results("SELECT * FROM `" . SIMPLEMASH_DB_SITES . "` s,`" . SIMPLEMASH_DB_ENTRIES . "` e WHERE e.site_id=s.id " . $condition . "ORDER BY e.id DESC", ARRAY_A);
		$result['entryCount'] = count($results);
		$result['entries'] = $results;
		if($results){
			echo json_encode($result);
		}
		else{
			$result['entryCount'] = 0;
			$result['entries'] = array();
			echo json_encode($result);
		}
	}

	/**
	 * simplemash_ajax_fetchEntry
	 *
	 * fetch entry from database and dynamically fill the content from the admin panel
	 *
	 * @param id
	 * @return JSON
	 */
	function simplemash_ajax_fetchEntry($id = null){
		global $wpdb;
		$result = array();
		$results = $wpdb->get_row("SELECT * FROM " . SIMPLEMASH_DB_ENTRIES . " WHERE id=" . $id, ARRAY_A);
		echo json_encode($results);
	}

	/**
	 * simplemash_ajax_saveEntry
	 *
	 * save entry to database from an entry form.
	 *
	 * @param id
	 * @param info
	 * @return integer/boolean
	 */
	function simplemash_ajax_saveEntry($id = null, $info = null){
		global $wpdb;
		$arr = unserialize(stripslashes($info));
		if(is_array($arr)){			
			if($wpdb->query("UPDATE " . SIMPLEMASH_DB_ENTRIES . " SET title='" . mysql_real_escape_string($arr['title']) . "', body='" . mysql_real_escape_string($arr['body']) . "' WHERE id=" . $id)){
				return 1;
			}
			return 0;
		}
		else {
			return 0;
		}
	}

	/**
	 * simplemash_ajax_deleteItem
	 *
	 * delete a Feed from database specified by ID
	 *
	 * @param integer $id ID of the Item to be deleted
	 * @return integer/boolean
	 */
	function simplemash_ajax_deleteItem($id){
		global $wpdb;
		// $post_id = $wpdb->get_var("SELECT post_id FROM " . SIMPLEMASH_DB_SITES . " WHERE id=" . $id);
		// if($post_id){
			// $wpdb->query("DELETE FROM " . SIMPLEMASH_DB_SITES . " WHERE id=" . $id);
			// wp_delete_post($post_id);
			// return 1;
		// }
		
		if($wpdb->query("DELETE FROM " . SIMPLEMASH_DB_SITES . " WHERE id=" . $id)){
			$ids = $wpdb->get_results("SELECT published FROM " . SIMPLEMASH_DB_ENTRIES . " WHERE approved=1 AND site_id=" . $id, ARRAY_A);
			if($ids){
				foreach($ids as $id){
					wp_delete_post($id);
				}
			}
			if(is_array($id)){				
				foreach($id as $i){
					$wpdb->query("DELETE FROM " . SIMPLEMASH_DB_ENTRIES . " WHERE site_id=" . $i);
				}
			}
			else{
				$wpdb->query("DELETE FROM " . SIMPLEMASH_DB_ENTRIES . " WHERE site_id=" . $id);
			}
			return 1;
		}
		return 0;
	}
		
	/**
	 * simplemash_ajax_aggregateFeeds
	 *
	 * an aggregation method called by AJAX to aggregate an array of Feeds by ID
	 *
	 * @param string $feeds array of IDs to be aggregated
	 * @return string
	 */
	function simplemash_ajax_aggregateFeeds($feeds = null){
		global $wpdb;
		$arr = unserialize(stripslashes($feeds));
		$entryCount = 0;
		$this->log('Started Forced Logging of SimpleMash Sites');
		foreach($arr as $a){
			$site = $wpdb->get_row("SELECT * FROM " . SIMPLEMASH_DB_SITES . " WHERE id=" . $a, ARRAY_A);
			$this->log('Aggregating from ID:' . $site['id']);
			$updateCount = $site['updated_times'];
			$timeToNextAggregation = ($site['frequency'] * 60);
			$nextUpdate = $site['next_update'];
			$timeNow = time();
			$timeAggregateFromNow = time() + $timeToNextAggregation;
			
			if($url == null){
				$this->feed->set_feed_url(str_replace(' ','+',$site['feed_url']));
				$this->feed->init();
			}
			
			/* Determine if the url is from Yahoo */
			$isYahooAnswer = false;
			$isYahooAnswerCat = false;
			if(preg_match("/http:\/\/answers.yahoo.com\/rss\/question\?qid\=/", $site['feed_url'])){
				$isYahooAnswer = true;
			}
			else if(preg_match("/http:\/\/answers.yahoo.com\/rss\//", $site['feed_url'])){
				$isYahooAnswerCat = true;
			}
			
			if($site['filter_from_title'] != "" || $site['filter_from_description'] != "" || $site['filter_from_body'] != "" || $site['filter_from_category'] != ""){
				$filter['title'] = $site['filter_from_title'];
				$filter['description'] = $site['filter_from_description'];
				$filter['content'] = $site['filter_from_body'];				
				$filter['category'] = $site['filter_from_category'];
			}
			
			$approved = $site['publish_automatically'];

			$gather = $site['gather'];
			$entry = 0;
			foreach ($this->feed->get_items() as $item){
				$this->log('-Aggregating from ' . $item->get_permalink());
				if($entry == $gather && $entry > 0){
					break;
				}
				$check = $wpdb->get_var("SELECT count(*) FROM " . SIMPLEMASH_DB_ENTRIES . " WHERE site_id=" . $site['id'] . " AND hash='" . md5($item->get_id(true) . $item->get_permalink()) ."'");
				$this->log("--Found " . $check . " records by checking . SELECT count(*) FROM " . SIMPLEMASH_DB_ENTRIES . " WHERE site_id=" . $site['id'] . " AND hash='" . md5($item->get_id(true) . $item->get_permalink()) ."'");
				if($check == 0){
					$this->log('--No record found. Aggregating this Item. Updating the Sites table.');
					$wpdb->query("UPDATE " . SIMPLEMASH_DB_SITES . " SET last_update='" . $timeNow . "', next_update='" . $timeAggregateFromNow . "' WHERE id=" . $site['id']);
				
					$site_id = $site['id'];
					$unique = md5($item->get_id(true) . $item->get_permalink());
					$entry_url = $item->get_permalink();
					$title = mysql_real_escape_string($item->get_title());
					$description = mysql_real_escape_string($item->get_description());
					$body = mysql_real_escape_string($item->get_content());
					$datetime = $item->get_date();
					$acquired = time();	
					
					$allow = false;					
					if(is_array($filter)){
						if(!empty($filter['title'])){
							if($this->__simplemash_checkFilter($filter['title'],$title) == true){
								$allow = true;
							}
						}					
						if(!empty($filter['description'])){
							if($this->__simplemash_checkFilter($filter['description'],$item->get_description()) == true){
								$allow = true;
							}
						}					
						if(!empty($filter['content'])){
							if($this->__simplemash_checkFilter($filter['content'],$body) == true){
								$allow = true;
							}
						}		
						if(!empty($filter['category'])){										
							if($category = $item->get_category()){
								$category = $category->get_label();
								if($this->__simplemash_checkFilter($filter['category'],$category) == true){
									$allow = true;
								}
							}
						}
					}
					else {
						$allow = true;
					}
					
					if($allow == true){
						$this->log("--Passed Filter, commencing with Aggregation. Inserting to Database with query: INSERT INTO " . SIMPLEMASH_DB_ENTRIES . "(site_id,hash,entry_url,title,description,body,datetime,acquired,approved) VALUES($site_id,'$unique','$entry_url','$title','$description','$body','$datetime','$acquired',$approved)");
						$wpdb->query("INSERT INTO " . SIMPLEMASH_DB_ENTRIES . "(site_id,hash,entry_url,title,description,body,datetime,acquired,approved) VALUES($site_id,'$unique','$entry_url','$title','$description','$body','$datetime','$acquired',$approved)");
						$eid = $wpdb->insert_id;
						$entries = $wpdb->get_row("SELECT e.*,s.site_name FROM `" . SIMPLEMASH_DB_ENTRIES . "` e,`" . SIMPLEMASH_DB_SITES . "` s WHERE e.id=$eid AND e.site_id=s.id", ARRAY_A);
						
						if($site['show_source'] == 1){
							$body = $body . "\n\r<p>Source: <a target=\"_blank\" href=\"$entry_url\">$entry_url</a></p>";
						}
						
						if($approved == 1){
							$post = array();
							$post['post_title'] = $title;						
							$post['post_excerpt'] = $description;
							$post['post_content'] = $body;
							$post['post_status'] = 'publish';
							$post['post_author'] = 1;
							$post['post_category'] = array($site['category_id']);
							
							$published = $wpdb->get_row("SELECT * FROM $wpdb->postmeta WHERE meta_key='simplemash_entry_id' AND meta_value='$eid'");
							if($published->num_rows == 0){
								$hid = wp_insert_post($post);
								//add_post_meta($hid, 'simplemash_hash', $entries['hash']);
								add_post_meta($hid, 'simplemash_entry_id', $entries['id']);
								//$wpdb->query("DELETE FROM " . SIMPLEMASH_DB_ENTRIES . " WHERE id=" . $eid);
								$wpdb->query("UPDATE " . SIMPLEMASH_DB_ENTRIES . " SET published=$hid, approved=1 WHERE id=" . $eid);
								
								$this->log("--Item is queued to Approve. Item Posted to WP_POSTS through the wp_insert_post function. updating Entries table with query: UPDATE " . SIMPLEMASH_DB_ENTRIES . " SET published=$hid, approved=1 WHERE id=" . $eid);
								
								if($isYahooAnswerCat == true){
									$comment_url = str_replace('question/index', 'rss/question', $entries['entry_url']);
									
									$this->feed->set_feed_url(str_replace(' ','+',$comment_url));
									$this->feed->init();
									foreach ($this->feed->get_items() as $item){
										$desc = explode(":", $item->get_title());
										$author = explode(" ", $desc[0]);
										$arr['comment_post_ID'] = $hid;
										$arr['comment_author'] = ($author['1'] != '') ? $author['1']: 'Anonymous';
										$arr['comment_content'] = $item->get_description();
										wp_insert_comment($arr);
									}									
								}
							}else{
								$this->log("--Item is already published. skipping to next item");
								continue;
							}
						}
						else{
							$return['entries'][$entry]['id'] = $entries['id'];
							$return['entries'][$entry]['entry_url'] = $entries['entry_url'];
							$return['entries'][$entry]['title'] = base64_encode($entries['title']);
							$return['entries'][$entry]['datetime'] = date("j F y, g:i a", $entries['acquired']);
							$return['entries'][$entry]['approved'] = $entries['approved'];	
							$return['entries'][$entry]['site_name'] = $entries['site_name'];
						}	
						$entryCount++;					
						$entry++;
					}
				}
			}
			$updateCount++;
			$wpdb->query("UPDATE " . SIMPLEMASH_DB_SITES . " SET updated_times=$updateCount, update_count=$entry, last_update='$timeNow', next_update='$timeAggregateFromNow' WHERE id=" . $site['id']);
			$arrstring .= 1 . "-";
			$this->log("Finished Aggregating\n------------");
		}
		$arrstring = $entryCount . "-" . $arrstring;
		return rtrim($arrstring,"-");
	}	
		
	/**
	 * simplemash_ajax_deleteFeeds
	 *
	 * delete an array of Feeds from the Database
	 *
	 * @param string $feeds array of IDs to be deleted
	 * @return string
	 */
	function simplemash_ajax_deleteFeeds($feeds = null){
		global $wpdb;
		$arr = unserialize(stripslashes($feeds));
		$arrstring = "";
		foreach($arr as $a){
			if($this->simplemash_ajax_deleteItem($a) == 1){
				$arrstring .= 1 . "-";
			}else{
				$arrstring .= 0 . "-";
			}			
		}
		echo rtrim($arrstring,"-");
	}
	
	/**
	 * simplemash_ajax_saveInfo
	 *
	 * Save the data from the edit form on the admin panel.
	 *
	 * @param string $info information to be saved
	 * @return integer/boolean
	 */
	function simplemash_ajax_saveInfo($info = null){
		global $wpdb;
		$arr = unserialize(stripslashes($info));
		if(is_array($arr)){
			$this->feed->set_feed_url(str_replace(' ','+',trim(base64_decode($arr['url']))));
			$this->feed->init();
			if($url = $this->feed->get_permalink()){				
				if($wpdb->query("UPDATE " . SIMPLEMASH_DB_SITES . " SET feed_url='" . base64_decode($arr['url']) . "', site_name='" . base64_decode($arr['title']) . "', site_url='" . $url . "', filter_from_title='" . $arr['filter_title'] . "', filter_from_body='" . $arr['filter_content'] . "', filter_from_description='" . $arr['filter_desc'] . "', filter_from_category='" . $arr['filter_category'] . "', category_id=" . $arr['category'] . ", publish_automatically=" . $arr['autopost'] . ", show_source=" . $arr['source'] . ", gather=" . $arr['gather'] . ", frequency=" . $arr['frequency'] . ", keep=" . $arr['keep'] . " WHERE id=" . $arr['id'])){
					return 1;
				}
				return 0;
			}
		}
		else {
			return 0;
		}
	}
	
	/**
	 * simplemash_ajax_approveEntry
	 *
	 * Approve an Entry from the Database Table
	 *
	 * @param string $id IDs for approval
	 * @return string
	 */
	function simplemash_ajax_approveEntry($id = null){
		global $wpdb;
		$eid = $id;
		$entry = $wpdb->get_row("SELECT e.*,s.site_name,s.show_source FROM `" . SIMPLEMASH_DB_ENTRIES . "` e,`" . SIMPLEMASH_DB_SITES . "` s WHERE e.id=$eid AND e.site_id=s.id", ARRAY_A);
		
		if($entry){						
			if($entry['show_source'] == 1){
				$entry['body'] = $entry['body'] . "\n\r<p>Source: <a target=\"_blank\" href=\"" . $entry['entry_url'] . "\">" . $entry['entry_url'] . "</a></p>";
			}
			
			$post = array();
			$post['post_title'] = $entry['title'];
			$post['post_excerpt'] = $entry['description'];
			$post['post_content'] = $entry['body'];
			$post['post_status'] = 'publish';
			$post['post_author'] = 1;
			$post['post_category'] = ($entry['category_id'] == null) ? array(1): array($entry['category_id']);
			$hid = wp_insert_post($post);
			add_post_meta($hid, 'simplemash_hash', $entry['hash']);
			add_post_meta($hid, 'simplemash_site_id', $entry['site_id']);
			if($wpdb->query("UPDATE " . SIMPLEMASH_DB_ENTRIES . " SET published=$hid, approved=1 WHERE id=" . $eid)){
				return 1;
			}	
		}
		return 0;
	}
	
	/**
	 * simplemash_ajax_approveEntries
	 *
	 * Approve an array of Entries from the Database Table
	 *
	 * @param string $feeds a serialized array where IDs are stored for approval
	 * @return string
	 */
	function simplemash_ajax_approveEntries($feeds = null){
		global $wpdb;
		$arr = unserialize(stripslashes($feeds));
		$entryCount = 0;
		foreach($arr as $a){
			$eid = $a;
			$entry = $wpdb->get_row("SELECT e.*,s.site_name,s.show_source FROM `" . SIMPLEMASH_DB_ENTRIES . "` e,`" . SIMPLEMASH_DB_SITES . "` s WHERE e.id=$eid AND e.site_id=s.id", ARRAY_A);
			
			if($entry){	
				if($entry['show_source'] == 1){
					$entry['body'] = $entry['body'] . "\n\r<p>Source: <a target=\"_blank\" href=\"" . $entry['entry_url'] . "\">" . $entry['entry_url'] . "</a></p>";
				}
				$post = array();
				$post['post_title'] = $entry['title'];
				$post['post_excerpt'] = $entry['description'];
				$post['post_content'] = $entry['body'];
				$post['post_status'] = 'publish';
				$post['post_author'] = 1;
				$post['post_category'] = ($entry['category_id'] == null) ? array(1): array($entry['category_id']);
				$hid = wp_insert_post($post);
				add_post_meta($hid, 'simplemash_hash', $entry['hash']);
				add_post_meta($hid, 'simplemash_site_id', $entry['site_id']);
				if($wpdb->query("UPDATE " . SIMPLEMASH_DB_ENTRIES . " SET published=$hid, approved=1 WHERE id=" . $eid)){
					$arrstring .= 1 . "-";
				}else{
					$arrstring .= 0 . "-";
				}
			}
		}
		echo rtrim($arrstring,"-");
	}
	
	/**
	 * simplemash_ajax_deleteEntries
	 *
	 * Deletes an array of Entries from the Database Table
	 *
	 * @param string $feeds a serialized array where IDs are stored for deletion
	 * @return string
	 */
	function simplemash_ajax_deleteEntries($feeds = null){
		global $wpdb;
		$arr = unserialize(stripslashes($feeds));
		$arrstring = "";
		foreach($arr as $a){
			$pid = $wpdb->get_row("SELECT published FROM " . SIMPLEMASH_DB_ENTRIES . " WHERE id=" . $a, ARRAY_A);			
			if($wpdb->query("DELETE FROM " . SIMPLEMASH_DB_ENTRIES . " WHERE id=" . $a)){
				if($pid['published'] > 0){
					wp_delete_post($pid['published']);
				}
				$arrstring .= 1 . "-";
			}else{
				$arrstring .= 0 . "-";
			}			
		}
		echo rtrim($arrstring,"-");
	}
	
	function simplemash_ajax_fetchFeeds(){
		global $wpdb;
		echo json_encode($wpdb->get_results("SELECT * FROM " . SIMPLEMASH_DB_SITES, ARRAY_A));
	}
	
	function simplemash_ajax_deleteEntry($id){
		global $wpdb;		
		$pid = $wpdb->get_row("SELECT * FROM " . SIMPLEMASH_DB_ENTRIES . " WHERE id=" . $id, ARRAY_A);			
		if($wpdb->query("DELETE FROM " . SIMPLEMASH_DB_ENTRIES . " WHERE id=" . $id)){	
			if($pid['published'] > 0){					
				wp_delete_post($row['ID']);
			}		
			return 1;
		}
		return 0;
	}
	
	function simplemash_ajax_clearEntries($id){
		global $wpdb;
		$results = $wpdb->get_var("SELECT count(*) FROM " . SIMPLEMASH_DB_SITES . " WHERE id=" . $id);
		if($results){
			$entries = $wpdb->get_results("SELECT * FROM " . SIMPLEMASH_DB_ENTRIES . " WHERE site_id=" . $id, ARRAY_A);
			if($entries){
				foreach($entries as $entry){
					if($entry['published'] > 0){
						wp_delete_post($entry['published']);
					}
					$wpdb->query("DELETE FROM " . SIMPLEMASH_DB_ENTRIES . " WHERE id=" . $entry['id']);
					
				}
				return 1;
			}
			
		}
		return 0;
	}
	
	function simplemash_deletepost($id){
		global $wpdb;
		$wpdb->query("DELETE FROM " . SIMPLEMASH_DB_ENTRIES . " WHERE published=" . $id);
	}
	
	/**
	 * __simplemash_checkFilter
	 *
	 * Check if a filter(string) is regex or a normal string. then validates if the text(string) may be allowed to be used.
	 *
	 * @param string $filter the filter to be used
	 * @param string $text the string to be filtered
	 * @return boolean
	 */
	function __simplemash_checkFilter($filter = null,$text = null){
		if($filter != null && $text != null){
			if(@preg_match("/\/*.\//",$filter)){
				if(preg_match($filter,$text)){
					return true;
				}
			}
			else{
				if(stripos($text, $filter) !== false){
					return true;
				}
			}
		}
		return false;
	}
	
	function __simplemash_since($original) {
	    $chunks = array(
	        array(60 * 60 * 24 * 365 , 'year'),
	        array(60 * 60 * 24 * 30 , 'month'),
	        array(60 * 60 * 24 * 7, 'week'),
	        array(60 * 60 * 24 , 'day'),
	        array(60 * 60 , 'hour'),
	        array(60 , 'minute'),
	    );	    
	    $today = time();
	    $since = $today - $original;
		
		if($since > 604800) {
			$print = date("M jS", $original);
		
			if($since > 31536000) {
					$print .= ", " . date("Y", $original);
				}

			return $print;

		}
		
	    for ($i = 0, $j = count($chunks); $i < $j; $i++) {
	        
	        $seconds = $chunks[$i][0];
	        $name = $chunks[$i][1];
	        if (($count = floor($since / $seconds)) != 0) {
	            break;
	        }
	    }

	    $print = ($count == 1) ? '1 '.$name : "$count {$name}s";
		if($print > 0){
			return $print . " ago";
		}
		else{
			return "Seconds ago";
		}
	}

}

//Line 1290 -  if($wpdb->query("UPDATE " . SIMPLEMASH_DB_ENTRIES . " SET published=$hid, approved=1 WHERE id=" . $eid)){
?>