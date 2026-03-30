import 'package:flutter/material.dart';
import 'package:lucide_icons/lucide_icons.dart';

class MediaDetailViewer extends StatelessWidget {
  final String title;
  final String subtitle;
  final String body;
  final String mediaLabel;
  final String mediaUrl;
  final bool liked;
  final bool saved;
  final VoidCallback? onLike;
  final VoidCallback? onComment;
  final VoidCallback? onSave;
  final VoidCallback? onClose;

  const MediaDetailViewer({Key? key, required this.title, this.subtitle = '', this.body = '', this.mediaLabel = 'Media', this.mediaUrl = '', this.liked = false, this.saved = false, this.onLike = null, this.onComment = null, this.onSave = null, this.onClose = null})
    : super(key: key)
;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: EdgeInsets.all(18),
      decoration: BoxDecoration(color: Color(0xFFFFFFFF), borderRadius: BorderRadius.circular(28), border: Border.all(color: Color(0xFFE5E7EB), width: 1)),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            crossAxisAlignment: CrossAxisAlignment.center,
            children: <Widget>[
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: <Widget>[
                  Text(
                    title.toString(),
                    style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: Color(0xFF111827)),
                  ),
                  SizedBox(height: 4),
                  if (subtitle.isNotEmpty) Text(
                    subtitle.toString(),
                    style: const TextStyle(fontSize: 12, color: Color(0xFF64748B)),
                  ),
                ],
              ),
              InkWell(
                onTap: onClose,
                child: Container(
                  width: 40,
                  height: 40,
                  decoration: BoxDecoration(color: Color(0xFFF8FAFC), borderRadius: BorderRadius.circular(999), border: Border.all(color: Color(0xFFE5E7EB), width: 1)),
                  child: Center(
                    child: Icon(
                      LucideIcons.x,
                      color: Color(0xFF111827),
                      size: 18,
                    ),
                  ),
                ),
              ),
            ],
          ),
          SizedBox(height: 14),
          Container(
            decoration: BoxDecoration(color: Color(0xFFFFFFFF), borderRadius: BorderRadius.circular(24), border: Border.all(color: Color(0xFFE5E7EB), width: 1)),
            child: Stack(
              children: <Widget>[
                if (mediaUrl.isNotEmpty) ClipRRect(
                  borderRadius: BorderRadius.circular(24),
                  child: Image.network(mediaUrl),
                ),
                if (mediaUrl.isEmpty) Container(
                  height: 280,
                  decoration: BoxDecoration(color: Color(0xFFF8FAFC)),
                  child: Center(
                    child: Icon(
                      LucideIcons.image,
                      color: Color(0xFF94A3B8),
                      size: 40,
                    ),
                  ),
                ),
                Positioned(
                  child: Container(
                    padding: EdgeInsets.symmetric(horizontal: 10, vertical: 12),
                    decoration: BoxDecoration(color: Color(0xFFFFFFFF), borderRadius: BorderRadius.circular(18)),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: <Widget>[
                        Text(
                          mediaLabel.toString(),
                          style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: Color(0xFF111827)),
                        ),
                        SizedBox(height: 4),
                        if (body.isNotEmpty) Text(
                          body.toString(),
                          style: const TextStyle(fontSize: 11, color: Color(0xFF64748B)),
                        ),
                      ],
                    ),
                  ),
                  left: 16,
                  right: 16,
                  bottom: 16,
                ),
              ],
            ),
          ),
          SizedBox(height: 14),
          Row(
            crossAxisAlignment: CrossAxisAlignment.center,
            children: <Widget>[
              Expanded(
                child: ElevatedButton(
                  onPressed: onLike,
                  style: ElevatedButton.styleFrom(backgroundColor: Color(0xFFFFFFFF), foregroundColor: Color(0xFF111827), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16))),
                  child: Text('Like'),
                ),
              ),
              SizedBox(width: 8),
              Expanded(
                child: ElevatedButton(
                  onPressed: onComment,
                  style: ElevatedButton.styleFrom(backgroundColor: Color(0xFFFFFFFF), foregroundColor: Color(0xFF111827), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16))),
                  child: Text('Comment'),
                ),
              ),
              SizedBox(width: 8),
              Expanded(
                child: ElevatedButton(
                  onPressed: onSave,
                  style: ElevatedButton.styleFrom(backgroundColor: Color(0xFFFFFFFF), foregroundColor: Color(0xFF111827), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16))),
                  child: Text('Save'),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
