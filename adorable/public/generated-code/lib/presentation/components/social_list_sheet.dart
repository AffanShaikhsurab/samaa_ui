import 'package:flutter/material.dart';

import 'privacy_state_badge.dart';
import 'relationship_action_chip.dart';
import 'surface_header.dart';

class SocialListSheet extends StatelessWidget {
  final String title;
  final String subtitle;
  final dynamic items;
  final ValueChanged<dynamic> onItemTap;
  final ValueChanged<dynamic> onPrimaryAction;
  final String primaryActionLabel;

  const SocialListSheet({Key? key, required this.title, this.subtitle = '', required this.items, required this.onItemTap, required this.onPrimaryAction, this.primaryActionLabel = 'Follow'})
    : super(key: key)
;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: EdgeInsets.all(20),
      decoration: BoxDecoration(color: Color(0xFFFFFFFF), borderRadius: BorderRadius.circular(28), border: Border.all(color: Color(0xFFE5E7EB), width: 1)),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          SurfaceHeader(
            title: title,
            subtitle: subtitle,
          ),
          SizedBox(height: 16),
          ListView.builder(
            itemCount: items.length,
            itemBuilder: (BuildContext context, int index) {
              final item = items[index];
              return Container(
                padding: EdgeInsets.fromLTRB(0, 0, 14, 0),
                child: InkWell(
                  onTap: () {
                    onItemTap(item.id);
                  },
                  child: Column(
                    children: <Widget>[
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        crossAxisAlignment: CrossAxisAlignment.center,
                        children: <Widget>[
                          Row(
                            crossAxisAlignment: CrossAxisAlignment.center,
                            children: <Widget>[
                              CircleAvatar(
                                child: Text(
                                  item.avatarText.isNotEmpty ? item.avatarText[0].toUpperCase() : 'P',
                                  style: TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.w700),
                                ),
                                radius: 24,
                                backgroundColor: Color(0xFF1D4ED8),
                              ),
                              SizedBox(width: 12),
                              Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: <Widget>[
                                  Text(
                                    item.displayName.toString(),
                                    style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700, color: Color(0xFF111827)),
                                  ),
                                  SizedBox(height: 2),
                                  Text(
                                    item.username.toString(),
                                    style: const TextStyle(fontSize: 12, color: Color(0xFF64748B)),
                                  ),
                                ],
                              ),
                            ],
                          ),
                          SizedBox(width: 12),
                          InkWell(
                            onTap: () {
                              onPrimaryAction(item.id);
                            },
                            child: RelationshipActionChip(
                              label: item.isFollowing ? "Following" : (item.followsYou ? "Follow back" : primaryActionLabel),
                              active: item.isFollowing,
                            ),
                          ),
                        ],
                      ),
                      if (item.followsYou && !item.isFollowing) Container(
                        padding: EdgeInsets.fromLTRB(8, 0, 0, 56),
                        child: PrivacyStateBadge(label: 'Follows you'),
                      ),
                    ],
                  ),
                ),
              );
            },
          ),
        ],
      ),
    );
  }
}
