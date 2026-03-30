import 'package:flutter/material.dart';
import 'package:lucide_icons/lucide_icons.dart';

class PostDraftPreview extends StatelessWidget {
  final String selectedLabel;

  const PostDraftPreview({Key? key, this.selectedLabel = 'No media selected yet'})
    : super(key: key)
;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 9999,
      height: 220,
      decoration: BoxDecoration(color: Color(0xFF111827), borderRadius: BorderRadius.circular(24), border: Border.all(color: Color(0xFF334155), width: 1)),
      child: Stack(
        children: <Widget>[
          Center(
            child: Icon(
              LucideIcons.imagePlus,
              color: Color(0xFFCBD5E1),
              size: 34,
            ),
          ),
          Positioned(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: <Widget>[
                Text(
                  'Selected media',
                  style: const TextStyle(fontSize: 12, color: Color(0xFF94A3B8)),
                ),
                SizedBox(height: 8),
                Text(
                  selectedLabel.toString(),
                  style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700, color: Colors.white),
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
