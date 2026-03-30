import 'package:flutter/material.dart';
import 'package:lucide_icons/lucide_icons.dart';

import 'surface_header.dart';

class MediaGrid extends StatelessWidget {
  final dynamic items;
  final String title;
  final String subtitle;
  final ValueChanged<dynamic> onItemTap;

  const MediaGrid({Key? key, required this.items, this.title = 'Posts', this.subtitle = 'Visual snapshots', required this.onItemTap})
    : super(key: key)
;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: <Widget>[
        SurfaceHeader(
          title: title,
          subtitle: subtitle,
        ),
        SizedBox(height: 12),
        Wrap(
          children: <Widget>[for (final item in items) InkWell(
            onTap: () {
              onItemTap(item.id);
            },
            child: Container(
              width: 112,
              height: 140,
              decoration: BoxDecoration(color: Color(0xFFFFFFFF), borderRadius: BorderRadius.circular(20), border: Border.all(color: Color(0xFFE5E7EB), width: 1)),
              child: Stack(
                children: <Widget>[
                  if (item.mediaUrl.isNotEmpty) ClipRRect(
                    borderRadius: BorderRadius.circular(20),
                    child: Image.network(item.mediaUrl),
                  ),
                  if (item.mediaUrl.isEmpty) Container(
                    decoration: BoxDecoration(color: Color(0xFFF8FAFC)),
                    child: Center(
                      child: Icon(
                        LucideIcons.image,
                        color: Color(0xFF94A3B8),
                        size: 28,
                      ),
                    ),
                  ),
                  Positioned(
                    child: Container(
                      padding: EdgeInsets.symmetric(horizontal: 8, vertical: 10),
                      decoration: BoxDecoration(color: Color(0xFFFFFFFF), borderRadius: BorderRadius.circular(16)),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: <Widget>[
                          Text(
                            item.author.toString(),
                            style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: Color(0xFF111827)),
                          ),
                          SizedBox(height: 2),
                          Text(
                            item.mediaLabel.toString(),
                            style: const TextStyle(fontSize: 11, color: Color(0xFF64748B)),
                          ),
                        ],
                      ),
                    ),
                    left: 10,
                    right: 10,
                    bottom: 10,
                  ),
                ],
              ),
            ),
          )],
        ),
      ],
    );
  }
}
