import 'package:meta/meta.dart';

@immutable
class ConversationMessage {
  final int id;
  final String author;
  final String body;
  final String attachmentTitle;
  final String attachmentMeta;
  final bool isOwn;
  final bool seen;

  const ConversationMessage({required this.id, required this.author, required this.body, this.attachmentTitle = "", this.attachmentMeta = "", this.isOwn = false, this.seen = false});

  static ConversationMessage fromJson(Map<String, dynamic> json) {
    return ConversationMessage(
      id: json['id'] as int,
      author: json['author'] as String,
      body: json['body'] as String,
      attachmentTitle: json['attachmentTitle'] as String,
      attachmentMeta: json['attachmentMeta'] as String,
      isOwn: json['isOwn'] as bool,
      seen: json['seen'] as bool,
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'id': id,
      'author': author,
      'body': body,
      'attachmentTitle': attachmentTitle,
      'attachmentMeta': attachmentMeta,
      'isOwn': isOwn,
      'seen': seen,
    };
  }

  ConversationMessage copyWith({int? id, String? author, String? body, String? attachmentTitle, String? attachmentMeta, bool? isOwn, bool? seen}) {
    return ConversationMessage(
      id: id ?? this.id,
      author: author ?? this.author,
      body: body ?? this.body,
      attachmentTitle: attachmentTitle ?? this.attachmentTitle,
      attachmentMeta: attachmentMeta ?? this.attachmentMeta,
      isOwn: isOwn ?? this.isOwn,
      seen: seen ?? this.seen,
    );
  }
}
