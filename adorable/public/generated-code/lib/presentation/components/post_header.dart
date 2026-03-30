import 'package:flutter/material.dart';
import 'package:lucide_icons/lucide_icons.dart';

class PostHeader extends StatelessWidget {
  final String author;
  final String handle;

  const PostHeader({Key? key, required this.author, required this.handle})
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
            CircleAvatar(
              child: Text(
                author.isNotEmpty ? author[0].toUpperCase() : 'P',
                style: TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.w800),
              ),
              radius: 22,
              backgroundColor: Color(0xFF1D4ED8),
            ),
            SizedBox(width: 12),
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: <Widget>[
                Text(
                  author.toString(),
                  style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Color(0xFF111827)),
                ),
                SizedBox(height: 2),
                Text(
                  handle.toString(),
                  style: const TextStyle(fontSize: 12, color: Color(0xFF6B7280)),
                ),
              ],
            ),
          ],
        ),
        Icon(
          LucideIcons.moreHorizontal,
          color: Color(0xFF6B7280),
          size: 18,
        ),
      ],
    );
  }
}
