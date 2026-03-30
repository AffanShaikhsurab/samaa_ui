import 'package:flutter/material.dart';
import 'package:lucide_icons/lucide_icons.dart';

class PostMedia extends StatelessWidget {
  final String mediaLabel;
  final String mediaUrl;

  const PostMedia({Key? key, this.mediaLabel = 'Preview', this.mediaUrl = ''})
    : super(key: key)
;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 9999,
      height: 468,
      decoration: BoxDecoration(color: Color(0xFFF8FAFC), borderRadius: BorderRadius.circular(24), border: Border.all(color: Color(0xFFE2E8F0), width: 1)),
      child: Stack(
        children: <Widget>[
          if (mediaUrl.isNotEmpty) ClipRRect(
            borderRadius: BorderRadius.circular(24),
            child: Image.network(mediaUrl),
          ),
          if (mediaUrl.isEmpty) Container(
            decoration: BoxDecoration(color: Color(0xFFF8FAFC)),
            child: Center(
              child: Icon(
                LucideIcons.image,
                color: Color(0xFF94A3B8),
                size: 30,
              ),
            ),
          ),
          Positioned(
            child: Container(
              padding: EdgeInsets.all(10),
              decoration: BoxDecoration(color: Color(0xFFFFFFFF), borderRadius: BorderRadius.circular(999), border: Border.all(color: Color(0xFFE2E8F0), width: 1)),
              child: Text(
                mediaLabel.toString(),
                style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: Color(0xFF111827)),
              ),
            ),
            top: 18,
            right: 18,
          ),
          Positioned(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: <Widget>[
                Icon(
                  LucideIcons.image,
                  color: Color(0xFF64748B),
                  size: 28,
                ),
                SizedBox(height: 10),
                Text(
                  mediaLabel.toString(),
                  style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w800, color: Color(0xFF111827)),
                ),
                SizedBox(height: 10),
                Text(
                  '4:5 feed preview',
                  style: const TextStyle(fontSize: 12, color: Color(0xFF64748B)),
                ),
              ],
            ),
            left: 20,
            right: 20,
            bottom: 20,
          ),
        ],
      ),
    );
  }
}
