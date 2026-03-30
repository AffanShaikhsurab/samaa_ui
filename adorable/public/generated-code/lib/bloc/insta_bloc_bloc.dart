import 'dart:async';

import 'package:flutter_bloc/flutter_bloc.dart';

import '../data/models/comment.dart';
import '../data/models/conversation_message.dart';
import '../data/models/conversation_thread.dart';
import '../data/models/explore_item.dart';
import '../data/models/highlight_item.dart';
import '../data/models/post.dart';
import '../data/models/relationship_user.dart';
import '../data/models/story.dart';
import '../data/repositories/insta_bloc_local_repository.dart';
import 'insta_bloc_event.dart';
import 'insta_bloc_state.dart';

class InstaBlocBloc extends Bloc<InstaBlocEvent, InstaBlocState> {
  final InstaBlocLocalRepository instaBlocLocalRepository;

  InstaBlocBloc({InstaBlocLocalRepository? instaBlocLocalRepositoryOverride})
    : instaBlocLocalRepository = instaBlocLocalRepositoryOverride ?? const InstaBlocLocalRepository(),
      super(InstaBlocState(
      activeTab: 'home',
      shellTab: 'home',
      stories: <Story>[],
      selectedStoryIndex: 0,
      selectedStoryStatus: '1 of 1',
      posts: <Post>[],
      exploreItems: <ExploreItem>[],
      searchQuery: '',
      searchResults: <ExploreItem>[],
      recentSearches: <String>[],
      selectedStoryLabel: 'Story',
      selectedPostId: 0,
      comments: <Comment>[],
      visibleComments: <Comment>[],
      commentDraft: '',
      commentQuickReactions: <String>[],
      replyingToUsername: '',
      selectedMediaLabel: 'No media selected yet',
      selectedMediaId: 0,
      selectedMediaTitle: '',
      selectedMediaAuthor: '',
      selectedMediaHandle: '',
      selectedMediaCaption: '',
      selectedMediaUrl: '',
      selectedMediaLiked: false,
      selectedMediaSaved: false,
      draftCaption: '',
      publishStatus: '',
      isPublishing: false,
      profileDisplayName: 'Ari Vega',
      profileUsername: '@ari.vega',
      profileBio: 'Art direction, campaigns, and motion-led product stories',
      profileLink: 'ari.vega/portfolio',
      profileSubtitle: 'Creator profile',
      profileAvatarText: 'AV',
      isFollowingProfile: false,
      isOwnProfile: false,
      isPrivateProfile: false,
      profileTab: 'posts',
      profilePosts: 42,
      followers: 12800,
      following: 318,
      profileMedia: <Post>[],
      profileHighlights: <HighlightItem>[],
      followersList: <RelationshipUser>[],
      followingList: <RelationshipUser>[],
      socialListMode: 'followers',
      inboxTab: 'primary',
      inboxThreads: <ConversationThread>[],
      visibleInboxThreads: <ConversationThread>[],
      inboxAccountUsername: 'makeupclips01',
      selectedConversationId: 0,
      messageDisplayName: 'makala',
      messageUsername: '@_.kala18_',
      messageAvatarText: 'MK',
      messageStatus: 'Active now',
      messageBanner: 'You can now organise chats with labels.',
      messageDraft: '',
      vanishModeEnabled: false,
      conversationMessages: <ConversationMessage>[],
      showMediaViewer: false,
      showSocialList: false,
    ))
 {
    on<InitInstaBlocEvent>(
      (InitInstaBlocEvent event, Emitter<InstaBlocState> emit) {
        emit(state.copyWith(stories: [
      Story(id:1, label:"You"),
      Story(id:2, label:"Mia"),
      Story(id:3, label:"Noah"),
      Story(id:4, label:"Ari"),
      Story(id:5, label:"Zoe", viewed:true)
    ]));
        emit(state.copyWith(posts: [
      Post(
        id:1,
        author:"Mia Chen",
        handle:"@mia.design",
        caption:"Golden hour, strong contrast, and a product feed that feels alive.",
        mediaLabel:"Studio shoot",
        mediaUrl:"https://picsum.photos/seed/studio-shoot/900/1200"
      ),
      Post(
        id:2,
        author:"Noah Patel",
        handle:"@noah.codes",
        caption:"Building social surfaces from reusable ANCL primitives.",
        mediaLabel:"Launch board",
        mediaUrl:"https://picsum.photos/seed/launch-board/900/1200",
        liked:true
      ),
      Post(
        id:3,
        author:"Luna Rivera",
        handle:"@luna.motion",
        caption:"Motion studies, layered gradients, and polished interactions.",
        mediaLabel:"Color study",
        mediaUrl:"https://picsum.photos/seed/color-study/900/1200",
        saved:true
      )
    ]));
        emit(state.copyWith(profileMedia: state.posts));
        emit(state.copyWith(profileHighlights: [
      HighlightItem(id:1, title:"Launches", coverLabel:"Launch"),
      HighlightItem(id:2, title:"Motion", coverLabel:"Motion"),
      HighlightItem(id:3, title:"Portfolio", coverLabel:"Work"),
      HighlightItem(id:4, title:"Saved", coverLabel:"Saved")
    ]));
        emit(state.copyWith(followersList: [
      RelationshipUser(id:1, displayName:"Mia Chen", username:"@mia.design", avatarText:"MC", isFollowing:true, followsYou:true),
      RelationshipUser(id:2, displayName:"Noah Patel", username:"@noah.codes", avatarText:"NP", isFollowing:true, followsYou:false),
      RelationshipUser(id:3, displayName:"Luna Rivera", username:"@luna.motion", avatarText:"LR", isFollowing:false, followsYou:true),
      RelationshipUser(id:4, displayName:"Zoe Park", username:"@zoe.studio", avatarText:"ZP", isFollowing:false, followsYou:false)
    ]));
        emit(state.copyWith(followingList: [
      RelationshipUser(id:11, displayName:"Mia Chen", username:"@mia.design", avatarText:"MC", isFollowing:true, followsYou:true),
      RelationshipUser(id:12, displayName:"Noah Patel", username:"@noah.codes", avatarText:"NP", isFollowing:true, followsYou:false),
      RelationshipUser(id:13, displayName:"Luna Rivera", username:"@luna.motion", avatarText:"LR", isFollowing:false, followsYou:true)
    ]));
        emit(state.copyWith(exploreItems: [
      ExploreItem(
        id:1,
        title:"Design systems",
        subtitle:"Reusable social surfaces and strong feed rhythm."
      ),
      ExploreItem(
        id:2,
        title:"Creator motion",
        subtitle:"Short-form storytelling with layered motion and polish."
      ),
      ExploreItem(
        id:3,
        title:"Product launch",
        subtitle:"Campaign assets, social previews, and polished cards."
      ),
      ExploreItem(
        id:4,
        title:"Editorial portrait",
        subtitle:"Photography direction with layered color and texture."
      ),
      ExploreItem(
        id:5,
        title:"Brand motion",
        subtitle:"Story-first loops designed for social campaigns."
      ),
      ExploreItem(
        id:6,
        title:"UI moodboard",
        subtitle:"Dark surfaces, neon accents, and tactile layouts."
      )
    ]));
        emit(state.copyWith(searchResults: state.exploreItems));
        emit(state.copyWith(selectedStoryStatus: "1 of " + state.stories.length.toString()));
        emit(state.copyWith(comments: [
      Comment(
        id:1,
        postId:1,
        author:"noah.codes",
        avatarText:"NP",
        timeLabel:"1d",
        body:"This layout feels polished.",
        likeCount:1,
        likedByAuthor:true
      ),
      Comment(
        id:2,
        postId:1,
        author:"ari.vega",
        avatarText:"AV",
        timeLabel:"20h",
        body:"Love the image rhythm here.",
        likeCount:4,
        liked:true
      ),
      Comment(
        id:3,
        postId:2,
        author:"mia.design",
        avatarText:"MC",
        timeLabel:"3h",
        body:"Reusable ANCL primitives are the move.",
        likeCount:2
      )
    ]));
        emit(state.copyWith(commentQuickReactions: ["❤️", "🙌", "🔥", "👏", "😢", "😍", "😮", "😂"]));
        emit(state.copyWith(inboxThreads: [
      ConversationThread(
        id:1,
        displayName:"makala",
        username:"@_.kala18_",
        avatarText:"MK",
        preview:"Seen · 2m",
        timeLabel:"2m",
        category:"primary",
        hasStory:true
      ),
      ConversationThread(
        id:2,
        displayName:"Mia Chen",
        username:"@mia.design",
        avatarText:"MC",
        preview:"Can you send the latest boards?",
        timeLabel:"18m",
        category:"primary",
        unread:true
      ),
      ConversationThread(
        id:3,
        displayName:"Noah Patel",
        username:"@noah.codes",
        avatarText:"NP",
        preview:"Sent · Shared a post",
        timeLabel:"1h",
        category:"general"
      ),
      ConversationThread(
        id:4,
        displayName:"Luna Rivera",
        username:"@luna.motion",
        avatarText:"LR",
        preview:"Wants to send you a message",
        timeLabel:"2h",
        category:"requests",
        unread:true
      )
    ]));
        emit(state.copyWith(visibleInboxThreads: state.inboxThreads.where((thread) => thread.category == state.inboxTab).toList()));
        emit(state.copyWith(conversationMessages: [
      ConversationMessage(
        id:1,
        author:"you",
        body:"Hey beautiful!\nWe just wanted to take a moment to say thank you for trusting us with your look. The full breakdown is attached below.",
        isOwn:true
      ),
      ConversationMessage(
        id:2,
        author:"you",
        body:"",
        attachmentTitle:"makeup_tutorial.pdf",
        attachmentMeta:"390 KiB · pdf",
        isOwn:true,
        seen:true
      )
    ]));
      },
    );
    on<SetPrimaryTabInstaBlocEvent>(
      (SetPrimaryTabInstaBlocEvent event, Emitter<InstaBlocState> emit) {
        emit(state.copyWith(activeTab: event.tab));
        emit(state.copyWith(shellTab: event.tab));
      },
    );
    on<CloseOverlayInstaBlocEvent>(
      (CloseOverlayInstaBlocEvent event, Emitter<InstaBlocState> emit) {
        emit(state.copyWith(activeTab: state.shellTab));
        emit(state.copyWith(showMediaViewer: false));
        emit(state.copyWith(showSocialList: false));
      },
    );
    on<SetProfileTabInstaBlocEvent>(
      (SetProfileTabInstaBlocEvent event, Emitter<InstaBlocState> emit) {
        final mediaItems = event.tab == "saved"
      ? state.posts.where((post) => post.saved).toList()
      : state.posts;
        emit(state.copyWith(profileTab: event.tab));
        emit(state.copyWith(profileMedia: mediaItems));
      },
    );
    on<OpenProfileMediaInstaBlocEvent>(
      (OpenProfileMediaInstaBlocEvent event, Emitter<InstaBlocState> emit) {
        emit(state.copyWith(selectedMediaId: event.postId));
        final media = state.posts.firstWhere((post) => post.id == event.postId);
        emit(state.copyWith(selectedMediaTitle: media.mediaLabel));
        emit(state.copyWith(selectedMediaAuthor: media.author));
        emit(state.copyWith(selectedMediaHandle: media.handle));
        emit(state.copyWith(selectedMediaCaption: media.caption));
        emit(state.copyWith(selectedMediaUrl: media.mediaUrl));
        emit(state.copyWith(selectedMediaLiked: media.liked));
        emit(state.copyWith(selectedMediaSaved: media.saved));
        emit(state.copyWith(showMediaViewer: true));
        emit(state.copyWith(showSocialList: false));
        emit(state.copyWith(activeTab: "profile_media"));
      },
    );
    on<OpenFollowersInstaBlocEvent>(
      (OpenFollowersInstaBlocEvent event, Emitter<InstaBlocState> emit) {
        emit(state.copyWith(socialListMode: "followers"));
        emit(state.copyWith(showSocialList: true));
        emit(state.copyWith(showMediaViewer: false));
        emit(state.copyWith(activeTab: "profile_followers"));
      },
    );
    on<OpenFollowingInstaBlocEvent>(
      (OpenFollowingInstaBlocEvent event, Emitter<InstaBlocState> emit) {
        emit(state.copyWith(socialListMode: "following"));
        emit(state.copyWith(showSocialList: true));
        emit(state.copyWith(showMediaViewer: false));
        emit(state.copyWith(activeTab: "profile_following"));
      },
    );
    on<ToggleProfilePrivacyInstaBlocEvent>(
      (ToggleProfilePrivacyInstaBlocEvent event, Emitter<InstaBlocState> emit) {
        final nextPrivate = !state.isPrivateProfile;
        emit(state.copyWith(isPrivateProfile: nextPrivate));
        emit(state.copyWith(profileSubtitle: nextPrivate ? "Private profile" : "Creator profile"));
      },
    );
    on<ToggleRelationshipInstaBlocEvent>(
      (ToggleRelationshipInstaBlocEvent event, Emitter<InstaBlocState> emit) {
        emit(state.copyWith(followersList: state.followersList.map((user) => user.id == event.userId
      ? RelationshipUser(
          id:user.id,
          displayName:user.displayName,
          username:user.username,
          avatarText:user.avatarText,
          isFollowing:!user.isFollowing,
          followsYou:user.followsYou
        )
      : user
    ).toList()));
        emit(state.copyWith(followingList: state.followingList.map((user) => user.id == event.userId
      ? RelationshipUser(
          id:user.id,
          displayName:user.displayName,
          username:user.username,
          avatarText:user.avatarText,
          isFollowing:!user.isFollowing,
          followsYou:user.followsYou
        )
      : user
    ).toList()));
      },
    );
    on<OpenStoryInstaBlocEvent>(
      (OpenStoryInstaBlocEvent event, Emitter<InstaBlocState> emit) {
        final matchedIndex = state.stories.indexWhere((story) => story.label == event.label);
        final nextIndex = matchedIndex >= 0 ? matchedIndex : 0;
        final updatedStories = state.stories.map((story) => story.label == event.label
      ? Story(id:story.id, label:story.label, viewed:true)
      : story
    ).toList();
        emit(state.copyWith(selectedStoryLabel: event.label));
        emit(state.copyWith(selectedStoryIndex: nextIndex));
        emit(state.copyWith(selectedStoryStatus: (nextIndex + 1).toString() + " of " + state.stories.length.toString()));
        emit(state.copyWith(stories: updatedStories));
        emit(state.copyWith(activeTab: "story"));
      },
    );
    on<NextStoryInstaBlocEvent>(
      (NextStoryInstaBlocEvent event, Emitter<InstaBlocState> emit) {
        if (state.selectedStoryIndex < state.stories.length - 1) {
          final nextIndex = state.selectedStoryIndex + 1;
          final nextLabel = state.stories[nextIndex].label;
          final updatedStories = state.stories.map((story) => story.label == nextLabel
        ? Story(id:story.id, label:story.label, viewed:true)
        : story
      ).toList();
          emit(state.copyWith(selectedStoryIndex: nextIndex));
          emit(state.copyWith(selectedStoryLabel: nextLabel));
          emit(state.copyWith(selectedStoryStatus: (nextIndex + 1).toString() + " of " + state.stories.length.toString()));
          emit(state.copyWith(stories: updatedStories));
        } else {
          add(const CloseOverlayInstaBlocEvent());
        }
      },
    );
    on<OpenCommentsInstaBlocEvent>(
      (OpenCommentsInstaBlocEvent event, Emitter<InstaBlocState> emit) {
        final filteredComments = state.comments.where((comment) => comment.postId == event.postId).toList();
        emit(state.copyWith(selectedPostId: event.postId));
        emit(state.copyWith(visibleComments: filteredComments));
        emit(state.copyWith(commentDraft: ""));
        emit(state.copyWith(replyingToUsername: ""));
        emit(state.copyWith(activeTab: "comments"));
      },
    );
    on<UpdateCommentDraftInstaBlocEvent>(
      (UpdateCommentDraftInstaBlocEvent event, Emitter<InstaBlocState> emit) {
        emit(state.copyWith(commentDraft: event.value));
      },
    );
    on<StartReplyInstaBlocEvent>(
      (StartReplyInstaBlocEvent event, Emitter<InstaBlocState> emit) {
        emit(state.copyWith(replyingToUsername: "@" + event.username));
      },
    );
    on<ClearReplyTargetInstaBlocEvent>(
      (ClearReplyTargetInstaBlocEvent event, Emitter<InstaBlocState> emit) {
        emit(state.copyWith(replyingToUsername: ""));
      },
    );
    on<ToggleCommentLikeInstaBlocEvent>(
      (ToggleCommentLikeInstaBlocEvent event, Emitter<InstaBlocState> emit) {
        final updatedComments = state.comments.map((comment) => comment.id == event.commentId
      ? Comment(
          id:comment.id,
          postId:comment.postId,
          author:comment.author,
          avatarText:comment.avatarText,
          timeLabel:comment.timeLabel,
          body:comment.body,
          likeCount:comment.liked ? (comment.likeCount > 0 ? comment.likeCount - 1 : 0) : comment.likeCount + 1,
          liked:!comment.liked,
          likedByAuthor:comment.likedByAuthor
        )
      : comment
    ).toList();
        emit(state.copyWith(comments: updatedComments));
        emit(state.copyWith(visibleComments: updatedComments.where((comment) => comment.postId == state.selectedPostId).toList()));
      },
    );
    on<AddCommentInstaBlocEvent>(
      (AddCommentInstaBlocEvent event, Emitter<InstaBlocState> emit) {
        final draft = state.commentDraft.trim();
        if (state.selectedPostId != 0 && draft.isNotEmpty) {
          final commentBody = state.replyingToUsername != ""
        ? state.replyingToUsername + " " + draft
        : draft;
          final updatedComments = [Comment(
        id:state.comments.length + 1,
        postId:state.selectedPostId,
        author:"you",
        avatarText:state.profileAvatarText,
        timeLabel:"now",
        body:commentBody
      ), ...state.comments];
          emit(state.copyWith(comments: updatedComments));
          emit(state.copyWith(visibleComments: updatedComments.where((comment) => comment.postId == state.selectedPostId).toList()));
          emit(state.copyWith(commentDraft: ""));
          emit(state.copyWith(replyingToUsername: ""));
        }
      },
    );
    on<QuickReactInstaBlocEvent>(
      (QuickReactInstaBlocEvent event, Emitter<InstaBlocState> emit) {
        if (state.selectedPostId != 0) {
          final commentBody = state.replyingToUsername != ""
        ? state.replyingToUsername + " " + event.emoji
        : event.emoji;
          final updatedComments = [Comment(
        id:state.comments.length + 1,
        postId:state.selectedPostId,
        author:"you",
        avatarText:state.profileAvatarText,
        timeLabel:"now",
        body:commentBody
      ), ...state.comments];
          emit(state.copyWith(comments: updatedComments));
          emit(state.copyWith(visibleComments: updatedComments.where((comment) => comment.postId == state.selectedPostId).toList()));
          emit(state.copyWith(commentDraft: ""));
          emit(state.copyWith(replyingToUsername: ""));
        }
      },
    );
    on<SetSearchQueryInstaBlocEvent>(
      (SetSearchQueryInstaBlocEvent event, Emitter<InstaBlocState> emit) {
        emit(state.copyWith(searchQuery: event.q));
        emit(state.copyWith(searchResults: event.q.isEmpty
      ? state.exploreItems
      : state.exploreItems.where((item) =>
          item.title.toLowerCase().contains(event.q.toLowerCase()) ||
          item.subtitle.toLowerCase().contains(event.q.toLowerCase())
        ).toList()));
        if (event.q.trim().length >= 3) {
          emit(state.copyWith(recentSearches: [event.q.trim(), ...state.recentSearches.where((item) => item != event.q.trim())].take(5).toList()));
        }
      },
    );
    on<ClearRecentSearchesInstaBlocEvent>(
      (ClearRecentSearchesInstaBlocEvent event, Emitter<InstaBlocState> emit) {
        emit(state.copyWith(recentSearches: []));
      },
    );
    on<SelectMediaInstaBlocEvent>(
      (SelectMediaInstaBlocEvent event, Emitter<InstaBlocState> emit) {
        emit(state.copyWith(selectedMediaLabel: event.attachment.name));
        emit(state.copyWith(selectedMediaTitle: event.attachment.name));
        emit(state.copyWith(selectedMediaUrl: ""));
        emit(state.copyWith(publishStatus: "Media selected. Ready to publish."));
        emit(state.copyWith(activeTab: "create"));
        emit(state.copyWith(shellTab: "create"));
      },
    );
    on<UpdateDraftCaptionInstaBlocEvent>(
      (UpdateDraftCaptionInstaBlocEvent event, Emitter<InstaBlocState> emit) {
        emit(state.copyWith(draftCaption: event.value));
      },
    );
    on<PublishDraftInstaBlocEvent>(
      (PublishDraftInstaBlocEvent event, Emitter<InstaBlocState> emit) {
        final nextPosts = [Post(
      id:state.posts.length + 1,
      author:"You",
      handle:"@instalite",
      caption:state.draftCaption.trim().isNotEmpty
        ? state.draftCaption
        : "Fresh post drafted from the built-in media flow.",
      mediaLabel:state.selectedMediaLabel != "No media selected yet"
        ? state.selectedMediaLabel
        : "Draft preview",
      mediaUrl:state.selectedMediaLabel != "No media selected yet"
        ? (state.selectedMediaUrl != "" ? state.selectedMediaUrl : "https://picsum.photos/seed/draft-preview/900/1200")
        : ""
    ), ...state.posts];
        final nextProfileMedia = state.profileTab == "saved"
      ? nextPosts.where((post) => post.saved).toList()
      : nextPosts;
        emit(state.copyWith(isPublishing: true));
        emit(state.copyWith(publishStatus: "Publishing draft..."));
        emit(state.copyWith(posts: nextPosts));
        emit(state.copyWith(profilePosts: state.profilePosts + 1));
        emit(state.copyWith(profileMedia: nextProfileMedia));
        emit(state.copyWith(selectedMediaLabel: "No media selected yet"));
        emit(state.copyWith(selectedMediaTitle: ""));
        emit(state.copyWith(selectedMediaAuthor: ""));
        emit(state.copyWith(selectedMediaHandle: ""));
        emit(state.copyWith(selectedMediaCaption: ""));
        emit(state.copyWith(selectedMediaUrl: ""));
        emit(state.copyWith(selectedMediaLiked: false));
        emit(state.copyWith(selectedMediaSaved: false));
        emit(state.copyWith(draftCaption: ""));
        emit(state.copyWith(isPublishing: false));
        emit(state.copyWith(publishStatus: "Published to your feed."));
        emit(state.copyWith(activeTab: "home"));
        emit(state.copyWith(shellTab: "home"));
      },
    );
    on<ToggleLikeInstaBlocEvent>(
      (ToggleLikeInstaBlocEvent event, Emitter<InstaBlocState> emit) {
        final updatedPosts = state.posts.map((post) => post.id == event.postId
      ? Post(
          id:post.id,
          author:post.author,
          handle:post.handle,
          caption:post.caption,
          mediaLabel:post.mediaLabel,
          mediaUrl:post.mediaUrl,
          liked:!post.liked,
          saved:post.saved
        )
      : post
    ).toList();
        emit(state.copyWith(posts: updatedPosts));
        emit(state.copyWith(profileMedia: state.profileTab == "saved"
      ? updatedPosts.where((post) => post.saved).toList()
      : updatedPosts));
        if (state.selectedMediaId == event.postId) {
          emit(state.copyWith(selectedMediaLiked: !state.selectedMediaLiked));
        }
      },
    );
    on<ToggleSaveInstaBlocEvent>(
      (ToggleSaveInstaBlocEvent event, Emitter<InstaBlocState> emit) {
        final updatedPosts = state.posts.map((post) => post.id == event.postId
      ? Post(
          id:post.id,
          author:post.author,
          handle:post.handle,
          caption:post.caption,
          mediaLabel:post.mediaLabel,
          mediaUrl:post.mediaUrl,
          liked:post.liked,
          saved:!post.saved
        )
      : post
    ).toList();
        emit(state.copyWith(posts: updatedPosts));
        emit(state.copyWith(profileMedia: state.profileTab == "saved"
      ? updatedPosts.where((post) => post.saved).toList()
      : updatedPosts));
        if (state.selectedMediaId == event.postId) {
          emit(state.copyWith(selectedMediaSaved: !state.selectedMediaSaved));
        }
      },
    );
    on<ToggleProfileFollowInstaBlocEvent>(
      (ToggleProfileFollowInstaBlocEvent event, Emitter<InstaBlocState> emit) {
        final nextFollowing = !state.isFollowingProfile;
        emit(state.copyWith(isFollowingProfile: nextFollowing));
        emit(state.copyWith(followers: nextFollowing ? state.followers + 1 : state.followers - 1));
      },
    );
    on<SetInboxTabInstaBlocEvent>(
      (SetInboxTabInstaBlocEvent event, Emitter<InstaBlocState> emit) {
        emit(state.copyWith(inboxTab: event.tab));
        emit(state.copyWith(visibleInboxThreads: state.inboxThreads.where((thread) => thread.category == event.tab).toList()));
      },
    );
    on<OpenInboxInstaBlocEvent>(
      (OpenInboxInstaBlocEvent event, Emitter<InstaBlocState> emit) {
        emit(state.copyWith(activeTab: "inbox"));
        emit(state.copyWith(visibleInboxThreads: state.inboxThreads.where((thread) => thread.category == state.inboxTab).toList()));
      },
    );
    on<OpenMessagesInstaBlocEvent>(
      (OpenMessagesInstaBlocEvent event, Emitter<InstaBlocState> emit) {
        add(const OpenInboxInstaBlocEvent());
      },
    );
    on<OpenConversationInstaBlocEvent>(
      (OpenConversationInstaBlocEvent event, Emitter<InstaBlocState> emit) {
        final thread = state.inboxThreads.firstWhere((item) => item.id == event.threadId);
        emit(state.copyWith(selectedConversationId: event.threadId));
        emit(state.copyWith(messageDisplayName: thread.displayName));
        emit(state.copyWith(messageUsername: thread.username));
        emit(state.copyWith(messageAvatarText: thread.avatarText));
        emit(state.copyWith(messageStatus: thread.category == "requests"
      ? "Message request"
      : thread.unread
        ? "Active now"
        : "Seen recently"));
        emit(state.copyWith(messageBanner: "You can now organise chats with labels."));
        emit(state.copyWith(messageDraft: ""));
        emit(state.copyWith(conversationMessages: event.threadId == 1
      ? [
          ConversationMessage(
            id:1,
            author:"you",
            body:"Hey beautiful!\nWe just wanted to take a moment to say thank you for trusting us with your look. The full breakdown is attached below.",
            isOwn:true
          ),
          ConversationMessage(
            id:2,
            author:"you",
            body:"",
            attachmentTitle:"makeup_tutorial.pdf",
            attachmentMeta:"390 KiB Â· pdf",
            isOwn:true,
            seen:true
          )
        ]
      : event.threadId == 2
        ? [
            ConversationMessage(
              id:1,
              author:"Mia Chen",
              body:"Can you send the latest boards?",
              isOwn:false
            ),
            ConversationMessage(
              id:2,
              author:"you",
              body:"Absolutely. I am packaging them up now.",
              isOwn:true,
              seen:true
            )
          ]
        : event.threadId == 3
          ? [
              ConversationMessage(
                id:1,
                author:"you",
                body:"Shared a post with you.",
                isOwn:true,
                seen:true
              ),
              ConversationMessage(
                id:2,
                author:"Noah Patel",
                body:"The reusable primitives are landing nicely.",
                isOwn:false
              )
            ]
          : [
              ConversationMessage(
                id:1,
                author:"Luna Rivera",
                body:"Hey, I loved your profile work. Would love to connect.",
                isOwn:false
              )
            ]));
        emit(state.copyWith(inboxThreads: state.inboxThreads.map((item) => item.id == event.threadId
      ? ConversationThread(
          id:item.id,
          displayName:item.displayName,
          username:item.username,
          avatarText:item.avatarText,
          preview:item.preview,
          timeLabel:item.timeLabel,
          category:item.category,
          hasStory:item.hasStory,
          unread:false
        )
      : item
    ).toList()));
        emit(state.copyWith(visibleInboxThreads: state.inboxThreads.where((item) => item.category == state.inboxTab).toList()));
        emit(state.copyWith(activeTab: "messages"));
      },
    );
    on<BackToInboxInstaBlocEvent>(
      (BackToInboxInstaBlocEvent event, Emitter<InstaBlocState> emit) {
        emit(state.copyWith(activeTab: "inbox"));
      },
    );
    on<UpdateMessageDraftInstaBlocEvent>(
      (UpdateMessageDraftInstaBlocEvent event, Emitter<InstaBlocState> emit) {
        emit(state.copyWith(messageDraft: event.value));
      },
    );
    on<SendMessageInstaBlocEvent>(
      (SendMessageInstaBlocEvent event, Emitter<InstaBlocState> emit) {
        final draft = state.messageDraft.trim();
        if (draft.isEmpty) {
          return;
        }
        emit(state.copyWith(conversationMessages: [...state.conversationMessages, ConversationMessage(
      id:state.conversationMessages.length + 1,
      author:"you",
      body:draft,
      isOwn:true,
      seen:true
    )]));
        emit(state.copyWith(inboxThreads: state.inboxThreads.map((item) => item.id == state.selectedConversationId
      ? ConversationThread(
          id:item.id,
          displayName:item.displayName,
          username:item.username,
          avatarText:item.avatarText,
          preview:draft,
          timeLabel:"now",
          category:item.category,
          hasStory:item.hasStory,
          unread:false
        )
      : item
    ).toList()));
        emit(state.copyWith(visibleInboxThreads: state.inboxThreads.where((item) => item.category == state.inboxTab).toList()));
        emit(state.copyWith(messageDraft: ""));
      },
    );
    on<DismissMessageBannerInstaBlocEvent>(
      (DismissMessageBannerInstaBlocEvent event, Emitter<InstaBlocState> emit) {
        emit(state.copyWith(messageBanner: ""));
      },
    );
    on<ToggleVanishModeInstaBlocEvent>(
      (ToggleVanishModeInstaBlocEvent event, Emitter<InstaBlocState> emit) {
        emit(state.copyWith(vanishModeEnabled: !state.vanishModeEnabled));
      },
    );
    on<HydrateInstaBlocStateEvent>(
      (HydrateInstaBlocStateEvent event, Emitter<InstaBlocState> emit) async {
        final restoredState = await this.instaBlocLocalRepository.load();
        if (restoredState != null) {
          emit(restoredState);
        } else {
          add(const InitInstaBlocEvent());
        }
      },
    );
    add(const HydrateInstaBlocStateEvent());
  }

  @override
  void onChange(Change<InstaBlocState> change) {
    super.onChange(change);
    unawaited(this.instaBlocLocalRepository.save(change.nextState));
  }
}
