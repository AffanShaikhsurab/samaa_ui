import 'package:flutter/material.dart';

import 'explore_tile.dart';
import 'section_header.dart';

import 'package:lucide_icons/lucide_icons.dart';
class ExploreGrid extends StatelessWidget {
  final dynamic items;
  final String title;
  final String subtitle;

  const ExploreGrid({Key? key, required this.items, this.title = 'Explore', this.subtitle = 'Discover content'})
    : super(key: key)
;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: <Widget>[
        SectionHeader(
          title: title,
          subtitle: subtitle,
        ),
        SizedBox(height: 12),
        Wrap(
          children: <Widget>[for (final item in items) ExploreTile(
            title: item.title,
            subtitle: item.subtitle,
            iconData: LucideIcons.sparkles,
          )],
        ),
      ],
    );
  }
}
