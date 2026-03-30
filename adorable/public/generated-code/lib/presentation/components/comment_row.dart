import 'package:flutter/material.dart';
import 'package:lucide_icons/lucide_icons.dart';

class CommentRow extends StatelessWidget {
  final String avatarText;
  final String author;
  final String timeLabel;
  final String body;
  final dynamic likeCount;
  final bool liked;
  final bool likedByAuthor;
  final VoidCallback? onLike;
  final VoidCallback? onReply;

  const CommentRow({Key? key, this.avatarText = 'U', required this.author, this.timeLabel = 'now', required this.body, this.likeCount = 0, this.liked = false, this.likedByAuthor = false, this.onLike = null, this.onReply = null})
    : super(key: key)
;

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: <Widget>[
        CircleAvatar(
          child: Text(
            avatarText.isNotEmpty ? avatarText[0].toUpperCase() : 'P',
            style: TextStyle(color: Colors.white, fontSize: 14, fontWeight: FontWeight.w700),
          ),
          radius: 18,
          backgroundColor: Color(0xFF2A2A2A),
        ),
        SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: <Widget>[
              Row(
                crossAxisAlignment: CrossAxisAlignment.center,
                children: <Widget>[
                  Text(
                    author.toString(),
                    style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: Colors.white),
                  ),
                  SizedBox(width: 8),
                  Text(
                    timeLabel.toString(),
                    style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w500, color: Color(0xFF999999)),
                  ),
                  SizedBox(width: 8),
                  if (likedByAuthor) Row(
                    crossAxisAlignment: CrossAxisAlignment.center,
                    children: <Widget>[
                      Icon(
                        Icons.favorite,
                        color: Color(0xFFEF4444),
                        size: 10,
                      ),
                      SizedBox(width: 4),
                      Text(
                        'by author',
                        style: const TextStyle(fontSize: 11, color: Color(0xFF999999)),
                      ),
                    ],
                  ),
                ],
              ),
              SizedBox(height: 8),
              Text(
                body.toString(),
                style: const TextStyle(fontSize: 14, color: Colors.white),
              ),
              SizedBox(height: 8),
              Row(
                crossAxisAlignment: CrossAxisAlignment.center,
                children: <Widget>[
                  InkWell(
                    onTap: onReply,
                    child: Text(
                      'Reply',
                      style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: Color(0xFF999999)),
                    ),
                  ),
                  SizedBox(width: 12),
                  if (likeCount > 0) Text(
                    likeCount.toString(),
                    style: const TextStyle(fontSize: 12, color: Color(0xFF999999)),
                  ),
                ],
              ),
            ],
          ),
        ),
        SizedBox(width: 12),
        InkWell(
          onTap: onLike,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.center,
            children: <Widget>[
              if (liked) Icon(
                Icons.favorite,
                color: Color(0xFFEF4444),
                size: 18,
              ),
              if (!(liked)) Icon(
                Icons.favorite_border,
                color: Color(0xFF999999),
                size: 18,
              ),
              SizedBox(height: 4),
              Text(
                likeCount.toString(),
                style: const TextStyle(fontSize: 12, color: Color(0xFF999999)),
              ),
            ],
          ),
        ),
      ],
    );
  }
}
