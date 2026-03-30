import 'package:flutter/material.dart';

import 'surface_header.dart';

class ProfileHighlightsRow extends StatelessWidget {
  final dynamic items;
  final String title;
  final String subtitle;
  final ValueChanged<dynamic> onItemTap;
  final VoidCallback? onAddTap;

  const ProfileHighlightsRow({Key? key, required this.items, this.title = 'Highlights', this.subtitle = 'Pinned story collections', required this.onItemTap, this.onAddTap = null})
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
        SizedBox(
          height: 132,
          child: ListView.builder(
            scrollDirection: Axis.horizontal,
            shrinkWrap: true,
            itemCount: items.length,
            itemBuilder: (BuildContext context, int index) {
              final item = items[index];
              return Container(
                padding: EdgeInsets.fromLTRB(0, 12, 0, 0),
                child: InkWell(
                  onTap: () {
                    onItemTap(item.title);
                  },
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.center,
                    children: <Widget>[
                      CircleAvatar(
                        child: Text(
                          item.coverLabel.isNotEmpty ? item.coverLabel[0].toUpperCase() : 'P',
                          style: TextStyle(color: Colors.white, fontSize: 24, fontWeight: FontWeight.w700),
                        ),
                        radius: 28,
                        backgroundColor: Color(0xFF111827),
                      ),
                      SizedBox(height: 8),
                      Text(
                        item.title.toString(),
                        style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: Colors.white),
                      ),
                    ],
                  ),
                ),
              );
            },
          ),
        ),
      ],
    );
  }
}
