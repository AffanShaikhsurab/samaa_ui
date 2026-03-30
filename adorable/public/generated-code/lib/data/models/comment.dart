import 'package:meta/meta.dart';

@immutable
class Comment {
  final int id;
  final int postId;
  final String author;
  final String avatarText;
  final String timeLabel;
  final String body;
  final int likeCount;
  final bool liked;
  final bool likedByAuthor;

  const Comment({required this.id, required this.postId, required this.author, required this.avatarText, this.timeLabel = "now", required this.body, this.likeCount = 0, this.liked = false, this.likedByAuthor = false});

  static Comment fromJson(Map<String, dynamic> json) {
    return Comment(
      id: json['id'] as int,
      postId: json['postId'] as int,
      author: json['author'] as String,
      avatarText: json['avatarText'] as String,
      timeLabel: json['timeLabel'] as String,
      body: json['body'] as String,
      likeCount: json['likeCount'] as int,
      liked: json['liked'] as bool,
      likedByAuthor: json['likedByAuthor'] as bool,
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'id': id,
      'postId': postId,
      'author': author,
      'avatarText': avatarText,
      'timeLabel': timeLabel,
      'body': body,
      'likeCount': likeCount,
      'liked': liked,
      'likedByAuthor': likedByAuthor,
    };
  }

  Comment copyWith({int? id, int? postId, String? author, String? avatarText, String? timeLabel, String? body, int? likeCount, bool? liked, bool? likedByAuthor}) {
    return Comment(
      id: id ?? this.id,
      postId: postId ?? this.postId,
      author: author ?? this.author,
      avatarText: avatarText ?? this.avatarText,
      timeLabel: timeLabel ?? this.timeLabel,
      body: body ?? this.body,
      likeCount: likeCount ?? this.likeCount,
      liked: liked ?? this.liked,
      likedByAuthor: likedByAuthor ?? this.likedByAuthor,
    );
  }
}
