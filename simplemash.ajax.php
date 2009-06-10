<?php
/**
 * AJAX Actions Bridges to the Simplemash API
 *
 * @author: 	John Rocela(me@iamjamoy.com)
 * @author_uri:	http://iamjamoy.com
 * @copyright:	Guru Consultation Services http://gurucs.com
 * @version:		1.0.15 RC3
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

// Get the Action String
$request = @$_POST['action'];
// Require the SimpleMash API
require_once 'simplemash.class.php';

// Instatiate the SimpleMash API
$fg = new SimpleMash();

// Switch case for the API Actions
switch($request){
	case 'checkfeed':
		$fg->simplemash_ajax_checkfeed($_POST['url']);
	break;
	case 'previewfeed':
		$fg->simplemash_ajax_previewfeed($_POST['url'],$_POST['filter']);
	break;
	case 'addfeed':
		$fg->simplemash_ajax_addfeed($_POST['url'],$_POST['title'],$_POST['filter'],$_POST['category'],$_POST['automatic'],$_POST['source'],$_POST['gather'],$_POST['frequency'],$_POST['keep'],@$_POST['addCategory'],@$_POST['addCategoryXML']);
	break;
	case 'fetchItem':
		$fg->simplemash_ajax_fetchItem($_POST['id']);
	break;
	case 'saveItem':
		$fg->simplemash_ajax_saveItem($_POST['id']);
	break;
	case 'deleteItem':
		echo $fg->simplemash_ajax_deleteItem($_POST['id']);
	break;
	case 'cleanEntries':
		echo $fg->simplemash_ajax_cleanentries();
	break;
	case 'fetchEntries':
		echo $fg->simplemash_ajax_fetchEntries($_POST['condition'],@$_POST['true']);
	break;
	case 'fetchEntry':
		echo $fg->simplemash_ajax_fetchEntry($_POST['id']);
	break;
	case 'saveEntry':
		echo $fg->simplemash_ajax_saveEntry($_POST['id'],$_POST['info']);
	break;
	case 'aggregateFeeds':
		echo $fg->simplemash_ajax_aggregateFeeds($_POST['feeds']);
	break;
	case 'deleteFeeds':
		$fg->simplemash_ajax_deleteFeeds($_POST['feeds']);
	break;
	case 'saveInfo':
		echo $fg->simplemash_ajax_saveInfo($_POST['info']);
	break;
	case 'deleteEntry':
		echo $fg->simplemash_ajax_deleteEntry($_POST['id']);
	break;
	case 'deleteEntries':
		echo $fg->simplemash_ajax_deleteEntries($_POST['entries']);
	break;
	case 'approveEntry':
		echo $fg->simplemash_ajax_approveEntry($_POST['id']);
	break;
	case 'approveEntries':
		$fg->simplemash_ajax_approveEntries($_POST['entries']);
	break;
	case 'fetchFeeds':
		echo $fg->simplemash_ajax_fetchFeeds();
	break;
	case 'deleteEntry':
		$fg->simplemash_ajax_deleteEntry($_POST['id']);
	break;
	case 'clearEntries':
		echo $fg->simplemash_ajax_clearEntries($_POST['id']);
	break;
}

?>