import 'package:meta/meta.dart';

@immutable
class ConversationThread {
  final int id;
  final String displayName;
  final String username;
  final String avatarText;
  final String preview;
  final String timeLabel;
  final String category;
  final bool hasStory;
  final bool unread;

  const ConversationThread({required this.id, required this.displayName, required this.username, required this.avatarText, required this.preview, required this.timeLabel, this.category = "primary", this.hasStory = false, this.unread = false});

  static ConversationThread fromJson(Map<String, dynamic> json) {
    return ConversationThread(
      id: json['id'] as int,
      displayName: json['displayName'] as String,
      username: json['username'] as String,
      avatarText: json['avatarText'] as String,
      preview: json['preview'] as String,
      timeLabel: json['timeLabel'] as String,
      category: json['category'] as String,
      hasStory: json['hasStory'] as bool,
      unread: json['unread'] as bool,
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'id': id,
      'displayName': displayName,
      'username': username,
      'avatarText': avatarText,
      'preview': preview,
      'timeLabel': timeLabel,
      'category': category,
      'hasStory': hasStory,
      'unread': unread,
    };
  }

  ConversationThread copyWith({int? id, String? displayName, String? username, String? avatarText, String? preview, String? timeLabel, String? category, bool? hasStory, bool? unread}) {
    return ConversationThread(
      id: id ?? this.id,
      displayName: displayName ?? this.displayName,
      username: username ?? this.username,
      avatarText: avatarText ?? this.avatarText,
      preview: preview ?? this.preview,
      timeLabel: timeLabel ?? this.timeLabel,
      category: category ?? this.category,
      hasStory: hasStory ?? this.hasStory,
      unread: unread ?? this.unread,
    );
  }
}
