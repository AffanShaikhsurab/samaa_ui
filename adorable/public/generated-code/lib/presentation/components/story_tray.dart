import 'package:flutter/material.dart';

import 'section_header.dart';
import 'story_bubble.dart';

import 'package:lucide_icons/lucide_icons.dart';
class StoryTray extends StatelessWidget {
  final dynamic stories;
  final ValueChanged<dynamic> onStoryTap;
  final String title;
  final String subtitle;

  const StoryTray({Key? key, required this.stories, required this.onStoryTap, this.title = 'Stories', this.subtitle = 'Latest updates'})
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
        SizedBox(
          height: 120,
          child: ListView.builder(
            scrollDirection: Axis.horizontal,
            shrinkWrap: true,
            itemCount: stories.length,
            itemBuilder: (BuildContext context, int index) {
              final item = stories[index];
              return Container(
                padding: EdgeInsets.fromLTRB(0, 12, 0, 0),
                child: InkWell(
                  onTap: () {
                    onStoryTap(item.label);
                  },
                  child: StoryBubble(
                    label: item.label,
                    viewed: item.viewed,
                    iconData: LucideIcons.userCircle,
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
