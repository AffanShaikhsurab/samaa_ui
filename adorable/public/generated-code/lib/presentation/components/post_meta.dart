import 'package:flutter/material.dart';

class PostMeta extends StatelessWidget {
  final String caption;

  const PostMeta({Key? key, required this.caption})
    : super(key: key)
;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: <Widget>[
        Text(
          caption.toString(),
          style: const TextStyle(fontSize: 14, color: Color(0xFF374151)),
        ),
        SizedBox(height: 8),
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          crossAxisAlignment: CrossAxisAlignment.center,
          children: <Widget>[
            Text(
              'View all comments',
              style: const TextStyle(fontSize: 12, color: Color(0xFF6B7280)),
            ),
            Text(
              '2 min ago',
              style: const TextStyle(fontSize: 11, color: Color(0xFF94A3B8)),
            ),
          ],
        ),
      ],
    );
  }
}
