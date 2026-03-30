import 'package:flutter/material.dart';
import 'package:lucide_icons/lucide_icons.dart';

class PostActions extends StatelessWidget {
  final bool liked;
  final bool saved;
  final VoidCallback? onLike;
  final VoidCallback? onComment;
  final VoidCallback? onShare;
  final VoidCallback? onSave;

  const PostActions({Key? key, this.liked = false, this.saved = false, this.onLike = null, this.onComment = null, this.onShare = null, this.onSave = null})
    : super(key: key)
;

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      crossAxisAlignment: CrossAxisAlignment.center,
      children: <Widget>[
        Row(
          crossAxisAlignment: CrossAxisAlignment.center,
          children: <Widget>[
            Column(
              children: <Widget>[if (liked) InkWell(
                onTap: onLike,
                child: Container(
                  width: 44,
                  height: 44,
                  padding: EdgeInsets.all(10),
                  decoration: BoxDecoration(borderRadius: BorderRadius.circular(999)),
                  child: Center(
                    child: Icon(
                      LucideIcons.heart,
                      color: Color(0xFFFB7185),
                      size: 24,
                    ),
                  ),
                ),
              ), if (!(liked)) InkWell(
                onTap: onLike,
                child: Container(
                  width: 44,
                  height: 44,
                  padding: EdgeInsets.all(10),
                  decoration: BoxDecoration(borderRadius: BorderRadius.circular(999)),
                  child: Center(
                    child: Icon(
                      LucideIcons.heart,
                      color: Color(0xFF111827),
                      size: 24,
                    ),
                  ),
                ),
              )],
            ),
            SizedBox(width: 18),
            InkWell(
              onTap: onComment,
              child: Container(
                width: 44,
                height: 44,
                padding: EdgeInsets.all(10),
                decoration: BoxDecoration(borderRadius: BorderRadius.circular(999)),
                child: Center(
                  child: Icon(
                    LucideIcons.messageCircle,
                    color: Colors.white,
                    size: 24,
                  ),
                ),
              ),
            ),
            SizedBox(width: 18),
            InkWell(
              onTap: onShare,
              child: Container(
                width: 44,
                height: 44,
                padding: EdgeInsets.all(10),
                decoration: BoxDecoration(borderRadius: BorderRadius.circular(999)),
                child: Center(
                  child: Icon(
                    LucideIcons.send,
                    color: Colors.white,
                    size: 24,
                  ),
                ),
              ),
            ),
          ],
        ),
        if (saved) InkWell(
          onTap: onSave,
          child: Container(
            width: 44,
            height: 44,
            padding: EdgeInsets.all(10),
            decoration: BoxDecoration(borderRadius: BorderRadius.circular(999)),
            child: Center(
              child: Icon(
                LucideIcons.bookmark,
                color: Color(0xFF111827),
                size: 24,
              ),
            ),
          ),
        ),
        if (!(saved)) InkWell(
          onTap: onSave,
          child: Container(
            width: 44,
            height: 44,
            padding: EdgeInsets.all(10),
            decoration: BoxDecoration(borderRadius: BorderRadius.circular(999)),
            child: Center(
              child: Icon(
                LucideIcons.bookmark,
                color: Color(0xFF6B7280),
                size: 24,
              ),
            ),
          ),
        ),
      ],
    );
  }
}
