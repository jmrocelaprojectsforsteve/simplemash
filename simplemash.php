<?php
/**
 * Plugin Name: 	SimpleMash RSS Aggregator
 * Plugin URI:	http://www.gurucs.com/products/simeplemash
 * Description:	Import Feeds from any URL you like and narrow them down with a simple Keyword Filter and attach your Feeds to categories. Manually Approve Feeds or automatically dispaly them to your blog.
 * @version:		1.0.17 RC3
 * Author: 		J. Rocela (me@iamjamoy.com)
 * Author URI:	http://www.gurucs.com
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

define ('SIMPLEMASH_VERSION','1.0.17 RC3'); //define version number

/**
 * simplemash_install
 *
 * installs the plugin's database tables and configurations
 *
 * @return void
 */
function simplemash_install(){
	global $wpdb;
		
	$site_table = $wpdb->prefix . "simplemash_sites";
	$sql = "CREATE TABLE IF NOT EXISTS `$site_table` (
		`id` int(11) NOT NULL auto_increment,
		`feed_url` text NOT NULL,
		`site_url` text NOT NULL,
		`site_name` char(128) NOT NULL,
		`description` char(255) NOT NULL,
		`last_update` char(10) NOT NULL,
		`next_update` char(10) NOT NULL,
		`updated_times` bigint(10) NOT NULL default '1',
		`update_count` bigint(10) default NULL,
		`filter_from_title` char(255) default NULL,
		`filter_from_body` char(255) default NULL,
		`filter_from_description` char(255) default NULL,
		`filter_from_category` char(255) default NULL,
		`category_id` bigint(20) default NULL,
		`publish_automatically` tinyint(1) NOT NULL default '1',
		`show_source` tinyint(1) NOT NULL default '1',
	    `gather` int(20) NOT NULL default '0',
	    `frequency` int(20) NOT NULL default '60',
	    `keep` int(20) NOT NULL default '5',
	    `post_id` bigint(20) default NULL,
		PRIMARY KEY  (`id`)
	) ENGINE=InnoDB  DEFAULT CHARSET=utf8 ;";
	$wpdb->query($sql);
	$entries_table = $wpdb->prefix . "simplemash_entries";	
	$sql = "CREATE TABLE IF NOT EXISTS `$entries_table` (
		`id` int(11) NOT NULL auto_increment,
		`site_id` int(11) NOT NULL,
		`hash` char(64) NOT NULL,
		`entry_url` text NOT NULL,
		`title` char(255) NOT NULL,
		`description` text,
		`body` text,
		`datetime` char(64) NOT NULL,
		`acquired` char(10) NOT NULL,
		`approved` tinyint(1) NOT NULL,
		`published` bigint(20) NOT NULL default '0',
		`time_published` char(10) default NULL,
		`category_id` bigint(20) default NULL,
		PRIMARY KEY  (`id`)
	) ENGINE=InnoDB  DEFAULT CHARSET=utf8 ;";
	$wpdb->query($sql);	
}

/**
 * @ignore
 */
function simplemash_uninstall(){	
	// PRESERVE DATA
	/**
	global $wpdb;
	$site_table = $wpdb->prefix . "simplemash_sites";
	$sql = "DROP TABLE $site_table;";
	$wpdb->query($sql);
	$entries_table = $wpdb->prefix . "simplemash_entries";	
	$sql = "DROP TABLE $entries_table;";
	$wpdb->query($sql);
	*/
}


register_activation_hook(__FILE__,'simplemash_install');
register_deactivation_hook(__FILE__,'simplemash_uninstall');

/**
 * require the simplemash class
 */
require_once "simplemash.class.php";

/**
 * initialize the simplemash class
 *
 * this method will check the plugin's requirements and the server's environment.
 */
$sm = new SimpleMash();

/**
 * use the simplemash fangs, i mean hooks
 *
 * this method will call the hooks associated to the simeplmash class. this is the most crucial method
 * for wordpress to use this plugin. *do not delete*
 */
$sm->wp_hook();

?>