import 'package:meta/meta.dart';

@immutable
abstract class InstaBlocEvent {
  const InstaBlocEvent();
}

class InitInstaBlocEvent extends InstaBlocEvent {
  const InitInstaBlocEvent();
}

class SetPrimaryTabInstaBlocEvent extends InstaBlocEvent {
  final String tab;

  const SetPrimaryTabInstaBlocEvent({required this.tab});
}

class CloseOverlayInstaBlocEvent extends InstaBlocEvent {
  const CloseOverlayInstaBlocEvent();
}

class SetProfileTabInstaBlocEvent extends InstaBlocEvent {
  final String tab;

  const SetProfileTabInstaBlocEvent({required this.tab});
}

class OpenProfileMediaInstaBlocEvent extends InstaBlocEvent {
  final int postId;

  const OpenProfileMediaInstaBlocEvent({required this.postId});
}

class OpenFollowersInstaBlocEvent extends InstaBlocEvent {
  const OpenFollowersInstaBlocEvent();
}

class OpenFollowingInstaBlocEvent extends InstaBlocEvent {
  const OpenFollowingInstaBlocEvent();
}

class ToggleProfilePrivacyInstaBlocEvent extends InstaBlocEvent {
  const ToggleProfilePrivacyInstaBlocEvent();
}

class ToggleRelationshipInstaBlocEvent extends InstaBlocEvent {
  final int userId;

  const ToggleRelationshipInstaBlocEvent({required this.userId});
}

class OpenStoryInstaBlocEvent extends InstaBlocEvent {
  final String label;

  const OpenStoryInstaBlocEvent({required this.label});
}

class NextStoryInstaBlocEvent extends InstaBlocEvent {
  const NextStoryInstaBlocEvent();
}

class OpenCommentsInstaBlocEvent extends InstaBlocEvent {
  final int postId;

  const OpenCommentsInstaBlocEvent({required this.postId});
}

class UpdateCommentDraftInstaBlocEvent extends InstaBlocEvent {
  final String value;

  const UpdateCommentDraftInstaBlocEvent({required this.value});
}

class StartReplyInstaBlocEvent extends InstaBlocEvent {
  final String username;

  const StartReplyInstaBlocEvent({required this.username});
}

class ClearReplyTargetInstaBlocEvent extends InstaBlocEvent {
  const ClearReplyTargetInstaBlocEvent();
}

class ToggleCommentLikeInstaBlocEvent extends InstaBlocEvent {
  final int commentId;

  const ToggleCommentLikeInstaBlocEvent({required this.commentId});
}

class AddCommentInstaBlocEvent extends InstaBlocEvent {
  const AddCommentInstaBlocEvent();
}

class QuickReactInstaBlocEvent extends InstaBlocEvent {
  final String emoji;

  const QuickReactInstaBlocEvent({required this.emoji});
}

class SetSearchQueryInstaBlocEvent extends InstaBlocEvent {
  final String q;

  const SetSearchQueryInstaBlocEvent({required this.q});
}

class ClearRecentSearchesInstaBlocEvent extends InstaBlocEvent {
  const ClearRecentSearchesInstaBlocEvent();
}

class SelectMediaInstaBlocEvent extends InstaBlocEvent {
  final dynamic attachment;

  const SelectMediaInstaBlocEvent({required this.attachment});
}

class UpdateDraftCaptionInstaBlocEvent extends InstaBlocEvent {
  final String value;

  const UpdateDraftCaptionInstaBlocEvent({required this.value});
}

class PublishDraftInstaBlocEvent extends InstaBlocEvent {
  const PublishDraftInstaBlocEvent();
}

class ToggleLikeInstaBlocEvent extends InstaBlocEvent {
  final int postId;

  const ToggleLikeInstaBlocEvent({required this.postId});
}

class ToggleSaveInstaBlocEvent extends InstaBlocEvent {
  final int postId;

  const ToggleSaveInstaBlocEvent({required this.postId});
}

class ToggleProfileFollowInstaBlocEvent extends InstaBlocEvent {
  const ToggleProfileFollowInstaBlocEvent();
}

class SetInboxTabInstaBlocEvent extends InstaBlocEvent {
  final String tab;

  const SetInboxTabInstaBlocEvent({required this.tab});
}

class OpenInboxInstaBlocEvent extends InstaBlocEvent {
  const OpenInboxInstaBlocEvent();
}

class OpenMessagesInstaBlocEvent extends InstaBlocEvent {
  const OpenMessagesInstaBlocEvent();
}

class OpenConversationInstaBlocEvent extends InstaBlocEvent {
  final int threadId;

  const OpenConversationInstaBlocEvent({required this.threadId});
}

class BackToInboxInstaBlocEvent extends InstaBlocEvent {
  const BackToInboxInstaBlocEvent();
}

class UpdateMessageDraftInstaBlocEvent extends InstaBlocEvent {
  final String value;

  const UpdateMessageDraftInstaBlocEvent({required this.value});
}

class SendMessageInstaBlocEvent extends InstaBlocEvent {
  const SendMessageInstaBlocEvent();
}

class DismissMessageBannerInstaBlocEvent extends InstaBlocEvent {
  const DismissMessageBannerInstaBlocEvent();
}

class ToggleVanishModeInstaBlocEvent extends InstaBlocEvent {
  const ToggleVanishModeInstaBlocEvent();
}

class HydrateInstaBlocStateEvent extends InstaBlocEvent {
  const HydrateInstaBlocStateEvent();
}
