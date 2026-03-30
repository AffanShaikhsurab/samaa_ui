import 'package:meta/meta.dart';

@immutable
class RelationshipUser {
  final int id;
  final String displayName;
  final String username;
  final String avatarText;
  final bool isFollowing;
  final bool followsYou;

  const RelationshipUser({required this.id, required this.displayName, required this.username, required this.avatarText, this.isFollowing = false, this.followsYou = false});

  static RelationshipUser fromJson(Map<String, dynamic> json) {
    return RelationshipUser(
      id: json['id'] as int,
      displayName: json['displayName'] as String,
      username: json['username'] as String,
      avatarText: json['avatarText'] as String,
      isFollowing: json['isFollowing'] as bool,
      followsYou: json['followsYou'] as bool,
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'id': id,
      'displayName': displayName,
      'username': username,
      'avatarText': avatarText,
      'isFollowing': isFollowing,
      'followsYou': followsYou,
    };
  }

  RelationshipUser copyWith({int? id, String? displayName, String? username, String? avatarText, bool? isFollowing, bool? followsYou}) {
    return RelationshipUser(
      id: id ?? this.id,
      displayName: displayName ?? this.displayName,
      username: username ?? this.username,
      avatarText: avatarText ?? this.avatarText,
      isFollowing: isFollowing ?? this.isFollowing,
      followsYou: followsYou ?? this.followsYou,
    );
  }
}
