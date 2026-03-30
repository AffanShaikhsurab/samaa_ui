import 'package:meta/meta.dart';

import '../data/models/comment.dart';
import '../data/models/conversation_message.dart';
import '../data/models/conversation_thread.dart';
import '../data/models/explore_item.dart';
import '../data/models/highlight_item.dart';
import '../data/models/post.dart';
import '../data/models/relationship_user.dart';
import '../data/models/story.dart';

@immutable
class InstaBlocState {
  final String activeTab;
  final String shellTab;
  final List<Story> stories;
  final int selectedStoryIndex;
  final String selectedStoryStatus;
  final List<Post> posts;
  final List<ExploreItem> exploreItems;
  final String searchQuery;
  final List<ExploreItem> searchResults;
  final List<String> recentSearches;
  final String selectedStoryLabel;
  final int selectedPostId;
  final List<Comment> comments;
  final List<Comment> visibleComments;
  final String commentDraft;
  final List<String> commentQuickReactions;
  final String replyingToUsername;
  final String selectedMediaLabel;
  final int selectedMediaId;
  final String selectedMediaTitle;
  final String selectedMediaAuthor;
  final String selectedMediaHandle;
  final String selectedMediaCaption;
  final String selectedMediaUrl;
  final bool selectedMediaLiked;
  final bool selectedMediaSaved;
  final String draftCaption;
  final String publishStatus;
  final bool isPublishing;
  final String profileDisplayName;
  final String profileUsername;
  final String profileBio;
  final String profileLink;
  final String profileSubtitle;
  final String profileAvatarText;
  final bool isFollowingProfile;
  final bool isOwnProfile;
  final bool isPrivateProfile;
  final String profileTab;
  final int profilePosts;
  final int followers;
  final int following;
  final List<Post> profileMedia;
  final List<HighlightItem> profileHighlights;
  final List<RelationshipUser> followersList;
  final List<RelationshipUser> followingList;
  final String socialListMode;
  final String inboxTab;
  final List<ConversationThread> inboxThreads;
  final List<ConversationThread> visibleInboxThreads;
  final String inboxAccountUsername;
  final int selectedConversationId;
  final String messageDisplayName;
  final String messageUsername;
  final String messageAvatarText;
  final String messageStatus;
  final String messageBanner;
  final String messageDraft;
  final bool vanishModeEnabled;
  final List<ConversationMessage> conversationMessages;
  final bool showMediaViewer;
  final bool showSocialList;

  InstaBlocState({this.activeTab = 'home', this.shellTab = 'home', this.stories = const [], this.selectedStoryIndex = 0, this.selectedStoryStatus = '1 of 1', this.posts = const [], this.exploreItems = const [], this.searchQuery = '', this.searchResults = const [], this.recentSearches = const [], this.selectedStoryLabel = 'Story', this.selectedPostId = 0, this.comments = const [], this.visibleComments = const [], this.commentDraft = '', this.commentQuickReactions = const [], this.replyingToUsername = '', this.selectedMediaLabel = 'No media selected yet', this.selectedMediaId = 0, this.selectedMediaTitle = '', this.selectedMediaAuthor = '', this.selectedMediaHandle = '', this.selectedMediaCaption = '', this.selectedMediaUrl = '', this.selectedMediaLiked = false, this.selectedMediaSaved = false, this.draftCaption = '', this.publishStatus = '', this.isPublishing = false, this.profileDisplayName = 'Ari Vega', this.profileUsername = '@ari.vega', this.profileBio = 'Art direction, campaigns, and motion-led product stories', this.profileLink = 'ari.vega/portfolio', this.profileSubtitle = 'Creator profile', this.profileAvatarText = 'AV', this.isFollowingProfile = false, this.isOwnProfile = false, this.isPrivateProfile = false, this.profileTab = 'posts', this.profilePosts = 42, this.followers = 12800, this.following = 318, this.profileMedia = const [], this.profileHighlights = const [], this.followersList = const [], this.followingList = const [], this.socialListMode = 'followers', this.inboxTab = 'primary', this.inboxThreads = const [], this.visibleInboxThreads = const [], this.inboxAccountUsername = 'makeupclips01', this.selectedConversationId = 0, this.messageDisplayName = 'makala', this.messageUsername = '@_.kala18_', this.messageAvatarText = 'MK', this.messageStatus = 'Active now', this.messageBanner = 'You can now organise chats with labels.', this.messageDraft = '', this.vanishModeEnabled = false, this.conversationMessages = const [], this.showMediaViewer = false, this.showSocialList = false});

  dynamic get activeTabIndex {
    return shellTab == "home" ? 0 : shellTab == "search" ? 1 : shellTab == "create" ? 2 : shellTab == "reels" ? 3 : 4;
  }

  dynamic get showShell {
    return activeTab == "home" || activeTab == "search" || activeTab == "create" || activeTab == "reels" || activeTab == "profile";
  }

  InstaBlocState copyWith({String? activeTab, String? shellTab, List<Story>? stories, int? selectedStoryIndex, String? selectedStoryStatus, List<Post>? posts, List<ExploreItem>? exploreItems, String? searchQuery, List<ExploreItem>? searchResults, List<String>? recentSearches, String? selectedStoryLabel, int? selectedPostId, List<Comment>? comments, List<Comment>? visibleComments, String? commentDraft, List<String>? commentQuickReactions, String? replyingToUsername, String? selectedMediaLabel, int? selectedMediaId, String? selectedMediaTitle, String? selectedMediaAuthor, String? selectedMediaHandle, String? selectedMediaCaption, String? selectedMediaUrl, bool? selectedMediaLiked, bool? selectedMediaSaved, String? draftCaption, String? publishStatus, bool? isPublishing, String? profileDisplayName, String? profileUsername, String? profileBio, String? profileLink, String? profileSubtitle, String? profileAvatarText, bool? isFollowingProfile, bool? isOwnProfile, bool? isPrivateProfile, String? profileTab, int? profilePosts, int? followers, int? following, List<Post>? profileMedia, List<HighlightItem>? profileHighlights, List<RelationshipUser>? followersList, List<RelationshipUser>? followingList, String? socialListMode, String? inboxTab, List<ConversationThread>? inboxThreads, List<ConversationThread>? visibleInboxThreads, String? inboxAccountUsername, int? selectedConversationId, String? messageDisplayName, String? messageUsername, String? messageAvatarText, String? messageStatus, String? messageBanner, String? messageDraft, bool? vanishModeEnabled, List<ConversationMessage>? conversationMessages, bool? showMediaViewer, bool? showSocialList}) {
    return InstaBlocState(
      activeTab: activeTab ?? this.activeTab,
      shellTab: shellTab ?? this.shellTab,
      stories: stories ?? this.stories,
      selectedStoryIndex: selectedStoryIndex ?? this.selectedStoryIndex,
      selectedStoryStatus: selectedStoryStatus ?? this.selectedStoryStatus,
      posts: posts ?? this.posts,
      exploreItems: exploreItems ?? this.exploreItems,
      searchQuery: searchQuery ?? this.searchQuery,
      searchResults: searchResults ?? this.searchResults,
      recentSearches: recentSearches ?? this.recentSearches,
      selectedStoryLabel: selectedStoryLabel ?? this.selectedStoryLabel,
      selectedPostId: selectedPostId ?? this.selectedPostId,
      comments: comments ?? this.comments,
      visibleComments: visibleComments ?? this.visibleComments,
      commentDraft: commentDraft ?? this.commentDraft,
      commentQuickReactions: commentQuickReactions ?? this.commentQuickReactions,
      replyingToUsername: replyingToUsername ?? this.replyingToUsername,
      selectedMediaLabel: selectedMediaLabel ?? this.selectedMediaLabel,
      selectedMediaId: selectedMediaId ?? this.selectedMediaId,
      selectedMediaTitle: selectedMediaTitle ?? this.selectedMediaTitle,
      selectedMediaAuthor: selectedMediaAuthor ?? this.selectedMediaAuthor,
      selectedMediaHandle: selectedMediaHandle ?? this.selectedMediaHandle,
      selectedMediaCaption: selectedMediaCaption ?? this.selectedMediaCaption,
      selectedMediaUrl: selectedMediaUrl ?? this.selectedMediaUrl,
      selectedMediaLiked: selectedMediaLiked ?? this.selectedMediaLiked,
      selectedMediaSaved: selectedMediaSaved ?? this.selectedMediaSaved,
      draftCaption: draftCaption ?? this.draftCaption,
      publishStatus: publishStatus ?? this.publishStatus,
      isPublishing: isPublishing ?? this.isPublishing,
      profileDisplayName: profileDisplayName ?? this.profileDisplayName,
      profileUsername: profileUsername ?? this.profileUsername,
      profileBio: profileBio ?? this.profileBio,
      profileLink: profileLink ?? this.profileLink,
      profileSubtitle: profileSubtitle ?? this.profileSubtitle,
      profileAvatarText: profileAvatarText ?? this.profileAvatarText,
      isFollowingProfile: isFollowingProfile ?? this.isFollowingProfile,
      isOwnProfile: isOwnProfile ?? this.isOwnProfile,
      isPrivateProfile: isPrivateProfile ?? this.isPrivateProfile,
      profileTab: profileTab ?? this.profileTab,
      profilePosts: profilePosts ?? this.profilePosts,
      followers: followers ?? this.followers,
      following: following ?? this.following,
      profileMedia: profileMedia ?? this.profileMedia,
      profileHighlights: profileHighlights ?? this.profileHighlights,
      followersList: followersList ?? this.followersList,
      followingList: followingList ?? this.followingList,
      socialListMode: socialListMode ?? this.socialListMode,
      inboxTab: inboxTab ?? this.inboxTab,
      inboxThreads: inboxThreads ?? this.inboxThreads,
      visibleInboxThreads: visibleInboxThreads ?? this.visibleInboxThreads,
      inboxAccountUsername: inboxAccountUsername ?? this.inboxAccountUsername,
      selectedConversationId: selectedConversationId ?? this.selectedConversationId,
      messageDisplayName: messageDisplayName ?? this.messageDisplayName,
      messageUsername: messageUsername ?? this.messageUsername,
      messageAvatarText: messageAvatarText ?? this.messageAvatarText,
      messageStatus: messageStatus ?? this.messageStatus,
      messageBanner: messageBanner ?? this.messageBanner,
      messageDraft: messageDraft ?? this.messageDraft,
      vanishModeEnabled: vanishModeEnabled ?? this.vanishModeEnabled,
      conversationMessages: conversationMessages ?? this.conversationMessages,
      showMediaViewer: showMediaViewer ?? this.showMediaViewer,
      showSocialList: showSocialList ?? this.showSocialList,
    );
  }

  static InstaBlocState fromJson(Map<String, dynamic> json) {
    return InstaBlocState(
      activeTab: json['activeTab'] as String,
      shellTab: json['shellTab'] as String,
      stories: (json['stories'] as List<dynamic>).map((e) => Story.fromJson(e as Map<String, dynamic>)).toList(),
      selectedStoryIndex: json['selectedStoryIndex'] as int,
      selectedStoryStatus: json['selectedStoryStatus'] as String,
      posts: (json['posts'] as List<dynamic>).map((e) => Post.fromJson(e as Map<String, dynamic>)).toList(),
      exploreItems: (json['exploreItems'] as List<dynamic>).map((e) => ExploreItem.fromJson(e as Map<String, dynamic>)).toList(),
      searchQuery: json['searchQuery'] as String,
      searchResults: (json['searchResults'] as List<dynamic>).map((e) => ExploreItem.fromJson(e as Map<String, dynamic>)).toList(),
      recentSearches: (json['recentSearches'] as List<dynamic>).map((e) => e as String).toList(),
      selectedStoryLabel: json['selectedStoryLabel'] as String,
      selectedPostId: json['selectedPostId'] as int,
      comments: (json['comments'] as List<dynamic>).map((e) => Comment.fromJson(e as Map<String, dynamic>)).toList(),
      visibleComments: (json['visibleComments'] as List<dynamic>).map((e) => Comment.fromJson(e as Map<String, dynamic>)).toList(),
      commentDraft: json['commentDraft'] as String,
      commentQuickReactions: (json['commentQuickReactions'] as List<dynamic>).map((e) => e as String).toList(),
      replyingToUsername: json['replyingToUsername'] as String,
      selectedMediaLabel: json['selectedMediaLabel'] as String,
      selectedMediaId: json['selectedMediaId'] as int,
      selectedMediaTitle: json['selectedMediaTitle'] as String,
      selectedMediaAuthor: json['selectedMediaAuthor'] as String,
      selectedMediaHandle: json['selectedMediaHandle'] as String,
      selectedMediaCaption: json['selectedMediaCaption'] as String,
      selectedMediaUrl: json['selectedMediaUrl'] as String,
      selectedMediaLiked: json['selectedMediaLiked'] as bool,
      selectedMediaSaved: json['selectedMediaSaved'] as bool,
      draftCaption: json['draftCaption'] as String,
      publishStatus: json['publishStatus'] as String,
      isPublishing: json['isPublishing'] as bool,
      profileDisplayName: json['profileDisplayName'] as String,
      profileUsername: json['profileUsername'] as String,
      profileBio: json['profileBio'] as String,
      profileLink: json['profileLink'] as String,
      profileSubtitle: json['profileSubtitle'] as String,
      profileAvatarText: json['profileAvatarText'] as String,
      isFollowingProfile: json['isFollowingProfile'] as bool,
      isOwnProfile: json['isOwnProfile'] as bool,
      isPrivateProfile: json['isPrivateProfile'] as bool,
      profileTab: json['profileTab'] as String,
      profilePosts: json['profilePosts'] as int,
      followers: json['followers'] as int,
      following: json['following'] as int,
      profileMedia: (json['profileMedia'] as List<dynamic>).map((e) => Post.fromJson(e as Map<String, dynamic>)).toList(),
      profileHighlights: (json['profileHighlights'] as List<dynamic>).map((e) => HighlightItem.fromJson(e as Map<String, dynamic>)).toList(),
      followersList: (json['followersList'] as List<dynamic>).map((e) => RelationshipUser.fromJson(e as Map<String, dynamic>)).toList(),
      followingList: (json['followingList'] as List<dynamic>).map((e) => RelationshipUser.fromJson(e as Map<String, dynamic>)).toList(),
      socialListMode: json['socialListMode'] as String,
      inboxTab: json['inboxTab'] as String,
      inboxThreads: (json['inboxThreads'] as List<dynamic>).map((e) => ConversationThread.fromJson(e as Map<String, dynamic>)).toList(),
      visibleInboxThreads: (json['visibleInboxThreads'] as List<dynamic>).map((e) => ConversationThread.fromJson(e as Map<String, dynamic>)).toList(),
      inboxAccountUsername: json['inboxAccountUsername'] as String,
      selectedConversationId: json['selectedConversationId'] as int,
      messageDisplayName: json['messageDisplayName'] as String,
      messageUsername: json['messageUsername'] as String,
      messageAvatarText: json['messageAvatarText'] as String,
      messageStatus: json['messageStatus'] as String,
      messageBanner: json['messageBanner'] as String,
      messageDraft: json['messageDraft'] as String,
      vanishModeEnabled: json['vanishModeEnabled'] as bool,
      conversationMessages: (json['conversationMessages'] as List<dynamic>).map((e) => ConversationMessage.fromJson(e as Map<String, dynamic>)).toList(),
      showMediaViewer: json['showMediaViewer'] as bool,
      showSocialList: json['showSocialList'] as bool,
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'activeTab': activeTab,
      'shellTab': shellTab,
      'stories': stories.map((e) => e.toJson()).toList(),
      'selectedStoryIndex': selectedStoryIndex,
      'selectedStoryStatus': selectedStoryStatus,
      'posts': posts.map((e) => e.toJson()).toList(),
      'exploreItems': exploreItems.map((e) => e.toJson()).toList(),
      'searchQuery': searchQuery,
      'searchResults': searchResults.map((e) => e.toJson()).toList(),
      'recentSearches': recentSearches.map((e) => e).toList(),
      'selectedStoryLabel': selectedStoryLabel,
      'selectedPostId': selectedPostId,
      'comments': comments.map((e) => e.toJson()).toList(),
      'visibleComments': visibleComments.map((e) => e.toJson()).toList(),
      'commentDraft': commentDraft,
      'commentQuickReactions': commentQuickReactions.map((e) => e).toList(),
      'replyingToUsername': replyingToUsername,
      'selectedMediaLabel': selectedMediaLabel,
      'selectedMediaId': selectedMediaId,
      'selectedMediaTitle': selectedMediaTitle,
      'selectedMediaAuthor': selectedMediaAuthor,
      'selectedMediaHandle': selectedMediaHandle,
      'selectedMediaCaption': selectedMediaCaption,
      'selectedMediaUrl': selectedMediaUrl,
      'selectedMediaLiked': selectedMediaLiked,
      'selectedMediaSaved': selectedMediaSaved,
      'draftCaption': draftCaption,
      'publishStatus': publishStatus,
      'isPublishing': isPublishing,
      'profileDisplayName': profileDisplayName,
      'profileUsername': profileUsername,
      'profileBio': profileBio,
      'profileLink': profileLink,
      'profileSubtitle': profileSubtitle,
      'profileAvatarText': profileAvatarText,
      'isFollowingProfile': isFollowingProfile,
      'isOwnProfile': isOwnProfile,
      'isPrivateProfile': isPrivateProfile,
      'profileTab': profileTab,
      'profilePosts': profilePosts,
      'followers': followers,
      'following': following,
      'profileMedia': profileMedia.map((e) => e.toJson()).toList(),
      'profileHighlights': profileHighlights.map((e) => e.toJson()).toList(),
      'followersList': followersList.map((e) => e.toJson()).toList(),
      'followingList': followingList.map((e) => e.toJson()).toList(),
      'socialListMode': socialListMode,
      'inboxTab': inboxTab,
      'inboxThreads': inboxThreads.map((e) => e.toJson()).toList(),
      'visibleInboxThreads': visibleInboxThreads.map((e) => e.toJson()).toList(),
      'inboxAccountUsername': inboxAccountUsername,
      'selectedConversationId': selectedConversationId,
      'messageDisplayName': messageDisplayName,
      'messageUsername': messageUsername,
      'messageAvatarText': messageAvatarText,
      'messageStatus': messageStatus,
      'messageBanner': messageBanner,
      'messageDraft': messageDraft,
      'vanishModeEnabled': vanishModeEnabled,
      'conversationMessages': conversationMessages.map((e) => e.toJson()).toList(),
      'showMediaViewer': showMediaViewer,
      'showSocialList': showSocialList,
    };
  }
}
