import 'package:flutter/material.dart';

import 'post_actions.dart';
import 'post_header.dart';
import 'post_media.dart';
import 'post_meta.dart';

class PostCard extends StatelessWidget {
  final String author;
  final String handle;
  final String caption;
  final String mediaLabel;
  final String mediaUrl;
  final bool liked;
  final bool saved;
  final VoidCallback? onLike;
  final VoidCallback? onComment;
  final VoidCallback? onShare;
  final VoidCallback? onSave;

  const PostCard({Key? key, required this.author, required this.handle, required this.caption, this.mediaLabel = 'Preview', this.mediaUrl = '', this.liked = false, this.saved = false, this.onLike = null, this.onComment = null, this.onShare = null, this.onSave = null})
    : super(key: key)
;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: EdgeInsets.all(20),
      decoration: BoxDecoration(color: Color(0xFFFFFFFF), borderRadius: BorderRadius.circular(28), border: Border.all(color: Color(0xFFE5E7EB), width: 1)),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          PostHeader(
            author: author,
            handle: handle,
          ),
          SizedBox(height: 16),
          PostMedia(
            mediaLabel: mediaLabel,
            mediaUrl: mediaUrl,
          ),
          SizedBox(height: 16),
          PostActions(
            liked: liked,
            saved: saved,
            onLike: onLike,
            onComment: onComment,
            onShare: onShare,
            onSave: onSave,
          ),
          SizedBox(height: 16),
          PostMeta(caption: caption),
        ],
      ),
    );
  }
}
