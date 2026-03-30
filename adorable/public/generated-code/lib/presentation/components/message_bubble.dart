import 'package:flutter/material.dart';
import 'package:lucide_icons/lucide_icons.dart';

class MessageBubble extends StatelessWidget {
  final String body;
  final String attachmentTitle;
  final String attachmentMeta;
  final bool isOwn;

  const MessageBubble({Key? key, required this.body, this.attachmentTitle = '', this.attachmentMeta = '', this.isOwn = false})
    : super(key: key)
;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: <Widget>[if (isOwn) Align(
        alignment: Alignment.center,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: <Widget>[
            if (body.isNotEmpty) Container(
              padding: EdgeInsets.symmetric(horizontal: 16, vertical: 16),
              decoration: BoxDecoration(color: Color(0xFF5B5BD6), borderRadius: BorderRadius.circular(20)),
              child: Text(
                body.toString(),
                style: const TextStyle(fontSize: 15, color: Colors.white),
              ),
            ),
            SizedBox(height: 8),
            if (attachmentTitle.isNotEmpty) Container(
              padding: EdgeInsets.symmetric(horizontal: 12, vertical: 12),
              decoration: BoxDecoration(color: Color(0xFF262626), borderRadius: BorderRadius.circular(16)),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.center,
                children: <Widget>[
                  Container(
                    padding: EdgeInsets.symmetric(horizontal: 8, vertical: 8),
                    decoration: BoxDecoration(color: Color(0xFF3A3A3A), borderRadius: BorderRadius.circular(999)),
                    child: Icon(
                      LucideIcons.fileText,
                      color: Colors.white,
                      size: 18,
                    ),
                  ),
                  SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: <Widget>[
                        Text(
                          attachmentTitle.toString(),
                          style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: Colors.white),
                        ),
                        SizedBox(height: 4),
                        Text(
                          attachmentMeta.toString(),
                          style: const TextStyle(fontSize: 11, color: Color(0xFF8E8E8E)),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ), if (!isOwn) Align(
        alignment: Alignment.center,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: <Widget>[
            if (body.isNotEmpty) Container(
              padding: EdgeInsets.symmetric(horizontal: 16, vertical: 16),
              decoration: BoxDecoration(color: Color(0xFF262626), borderRadius: BorderRadius.circular(20)),
              child: Text(
                body.toString(),
                style: const TextStyle(fontSize: 15, color: Colors.white),
              ),
            ),
            SizedBox(height: 8),
            if (attachmentTitle.isNotEmpty) Container(
              padding: EdgeInsets.symmetric(horizontal: 12, vertical: 12),
              decoration: BoxDecoration(color: Color(0xFF262626), borderRadius: BorderRadius.circular(16)),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.center,
                children: <Widget>[
                  Container(
                    padding: EdgeInsets.symmetric(horizontal: 8, vertical: 8),
                    decoration: BoxDecoration(color: Color(0xFF3A3A3A), borderRadius: BorderRadius.circular(999)),
                    child: Icon(
                      LucideIcons.fileText,
                      color: Colors.white,
                      size: 18,
                    ),
                  ),
                  SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: <Widget>[
                        Text(
                          attachmentTitle.toString(),
                          style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: Colors.white),
                        ),
                        SizedBox(height: 4),
                        Text(
                          attachmentMeta.toString(),
                          style: const TextStyle(fontSize: 11, color: Color(0xFF8E8E8E)),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      )],
    );
  }
}
