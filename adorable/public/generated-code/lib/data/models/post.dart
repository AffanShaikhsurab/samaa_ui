import 'package:meta/meta.dart';

@immutable
class Post {
  final int id;
  final String author;
  final String handle;
  final String caption;
  final String mediaLabel;
  final String mediaUrl;
  final bool liked;
  final bool saved;

  const Post({required this.id, required this.author, required this.handle, required this.caption, required this.mediaLabel, this.mediaUrl = "", this.liked = false, this.saved = false});

  static Post fromJson(Map<String, dynamic> json) {
    return Post(
      id: json['id'] as int,
      author: json['author'] as String,
      handle: json['handle'] as String,
      caption: json['caption'] as String,
      mediaLabel: json['mediaLabel'] as String,
      mediaUrl: json['mediaUrl'] as String,
      liked: json['liked'] as bool,
      saved: json['saved'] as bool,
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'id': id,
      'author': author,
      'handle': handle,
      'caption': caption,
      'mediaLabel': mediaLabel,
      'mediaUrl': mediaUrl,
      'liked': liked,
      'saved': saved,
    };
  }

  Post copyWith({int? id, String? author, String? handle, String? caption, String? mediaLabel, String? mediaUrl, bool? liked, bool? saved}) {
    return Post(
      id: id ?? this.id,
      author: author ?? this.author,
      handle: handle ?? this.handle,
      caption: caption ?? this.caption,
      mediaLabel: mediaLabel ?? this.mediaLabel,
      mediaUrl: mediaUrl ?? this.mediaUrl,
      liked: liked ?? this.liked,
      saved: saved ?? this.saved,
    );
  }
}
